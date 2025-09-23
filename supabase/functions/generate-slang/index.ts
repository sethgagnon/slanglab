import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------- Diagnostics v2 (Response-aware) ----------------
const HEADER_KEYS = [
  // OpenAI
  "x-request-id","openai-model",
  "x-ratelimit-remaining-requests","x-ratelimit-reset-requests",
  "x-ratelimit-remaining-tokens","x-ratelimit-reset-tokens",
  "retry-after",
  // Supabase/Cloudflare/Deno
  "sb-request-id","sb-project-ref","x-sb-edge-region",
  "cf-ray","server","x-served-by","x-deno-execution-id"
];

function isResponseLike(x: any): x is Response {
  return !!x && typeof x === "object"
    && "headers" in x && typeof (x as any).headers?.get === "function"
    && typeof (x as any).text === "function"
    && ("ok" in x);
}

function pickHeaders(h: Headers | undefined | null) {
  if (!h?.get) return {};
  const out: Record<string, string> = {};
  for (const k of HEADER_KEYS) {
    const v = h.get(k);
    if (v) out[k] = v;
  }
  return out;
}

async function readBodySafe(resp: Response | undefined | null) {
  try {
    if (!resp?.clone) return undefined;
    const txt = await resp.clone().text();
    return txt && txt.length ? txt.slice(0, 4000) : undefined;
  } catch {
    return undefined;
  }
}

// Normalize any thrown error into { status, headers, body, message }
async function normalizeErr(e: any) {
  // Case A: error itself is a Response
  if (isResponseLike(e)) {
    return {
      status: e.status ?? 500,
      headers: pickHeaders(e.headers),
      body: await readBodySafe(e),
      message: `Response ${e.status}`
    };
  }
  // Case B: error.response is a Response
  if (isResponseLike(e?.response)) {
    return {
      status: e.response.status ?? 500,
      headers: pickHeaders(e.response.headers),
      body: await readBodySafe(e.response),
      message: typeof e?.message === "string" ? e.message : `Response ${e.response.status}`
    };
  }
  // Case C: plain Error / unknown
  return {
    status: Number(e?.status ?? 429) || 429,
    headers: {},
    body: undefined,
    message: typeof e?.message === "string" ? e.message : String(e)
  };
}

async function buildDiag(e: any, source: "openai"|"supabase"|"proxy"|"unknown") {
  const norm = await normalizeErr(e);
  return {
    status: norm.status,
    error: (e?.error ?? "upstream_error"),
    detail: norm.message,
    diag: { source, status: norm.status, headers: norm.headers, body: norm.body }
  };
}

async function diagResponse(e: any, source: "openai"|"supabase"|"proxy"|"unknown") {
  const payload = await buildDiag(e, source);
  const reqId = payload.diag.headers["sb-request-id"] || payload.diag.headers["x-request-id"] || "";
  console.error("[generate-slang diag]", reqId, JSON.stringify(payload));
  return new Response(JSON.stringify(payload), {
    status: payload.status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
// ---------------- End Diagnostics v2 ----------------

type AnyDict = Record<string, unknown>;

async function readJsonSafe(req: Request): Promise<AnyDict> {
  try {
    const j = await req.json();
    return (j && typeof j === "object") ? j as AnyDict : {};
  } catch { return {}; }
}

const isString = (x: unknown): x is string => typeof x === "string";
const isBool   = (x: unknown): x is boolean => typeof x === "boolean";
const isNum    = (x: unknown): x is number  => typeof x === "number" && Number.isFinite(x);
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isString);
const nonEmpty = (s: unknown): s is string => isString(s) && s.trim().length > 0;

function aliasString(obj: AnyDict, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (nonEmpty(v)) return String(v);
  }
  return undefined;
}

function clamp01(n: unknown, def = 0.7): number {
  if (!isNum(n)) return def;
  return Math.max(0, Math.min(1, n));
}

function buildPromptFromShape(input: {
  prompt?: string;
  vibe?: string;
  vibeTags?: string[];
  context?: string;
  format?: string;
  ageBand?: string;
  schoolSafe?: boolean;
}): { userMsg: string; vibeOut?: string } {
  // If explicit prompt provided, honor it (back-compat)
  if (nonEmpty(input.prompt)) {
    const parts = [input.vibe, input.ageBand, input.prompt].filter(nonEmpty);
    return { userMsg: parts.join(" | "), vibeOut: input.vibe };
  }
  // Otherwise construct from new shape
  const vibeStr = isStrArr(input.vibeTags) && input.vibeTags.length
    ? input.vibeTags.join(", ")
    : (nonEmpty(input.vibe) ? input.vibe : undefined);

  const fmt = nonEmpty(input.format) ? input.format : "phrase";
  const ctx = nonEmpty(input.context) ? input.context : undefined;
  const age = nonEmpty(input.ageBand) ? input.ageBand : undefined;

  // Build a concise, deterministic instruction for the model
  const parts: string[] = [];
  parts.push(`Format: ${fmt}`);
  if (ctx) parts.push(`Context: ${ctx}`);
  if (vibeStr) parts.push(`Vibe: ${vibeStr}`);
  if (age) parts.push(`Audience: ${age}`);
  // Add the ask:
  parts.push("Task: generate one slang candidate.");

  return { userMsg: parts.join(" | "), vibeOut: vibeStr };
}

// ==== PHASE 1: INFLIGHT TRACKING & SINGLE-FLIGHT PROTECTION ====
const inflight = new Map<string, { promise: Promise<any>, started: number }>();
const locks = new Map<string, { promise: Promise<void>, started: number }>();

// Prune old entries to prevent memory leaks
function pruneOldEntries() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, entry] of inflight.entries()) {
    if (now - entry.started > maxAge) {
      inflight.delete(key);
    }
  }

  for (const [key, entry] of locks.entries()) {
    if (now - entry.started > maxAge) {
      locks.delete(key);
    }
  }
}

// ==== PHASE 2: ROBUST RETRY WITH BACKOFF + JITTER ====
async function withBackoff<T>(fn: () => Promise<T>, max = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status ?? 0;
      const headers = err?.response?.headers;
      
      // Retry only on 429 and 5xx
      const shouldRetry = status === 429 || (status >= 500 && status <= 599);
      if (!shouldRetry || attempt >= max) throw err;
      
      // Honor Retry-After if present
      const retryAfter = headers?.get?.("retry-after");
      const base = Math.min(30000, 400 * (2 ** attempt));
      const jitter = Math.random() * 300;
      const delay = retryAfter ? Number(retryAfter) * 1000 : base + jitter;
      
      console.log(`Retrying attempt ${attempt + 1}/${max} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ==== PHASE 3: SINGLE-FLIGHT PROTECTION WITH TIMEOUTS ====
async function withSingleFlight<T>(userKey: string, fn: () => Promise<T>, timeoutMs = 45000): Promise<T> {
  const prev = locks.get(userKey)?.promise ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(res => (release = res));
  locks.set(userKey, { promise: prev.then(() => current), started: Date.now() });
  
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("single-flight timeout")), timeoutMs))
    ]);
  } finally {
    release();
    if (locks.get(userKey)?.promise === current) {
      locks.delete(userKey);
    }
  }
}

// ==== PHASE 4: ENHANCED HEADER-AWARE PACING ====
async function applyRateLimitPacing(resp: Response) {
  const reqRemain = Number(resp.headers.get("x-ratelimit-remaining-requests") ?? 0);
  const reqResetS = Number(resp.headers.get("x-ratelimit-reset-requests") ?? 0);
  const tokRemain = Number(resp.headers.get("x-ratelimit-remaining-tokens") ?? 0);
  const tokResetS = Number(resp.headers.get("x-ratelimit-reset-tokens") ?? 0);
  const resetMs = Math.max(reqResetS, tokResetS) * 1000;
  
  console.log(`Rate limit status: ${reqRemain} requests, ${tokRemain} tokens remaining`);
  
  if ((reqRemain <= 1 || tokRemain <= 1) && resetMs > 0) {
    const delayMs = Math.min(15000, resetMs);
    console.log(`Applying rate limit pacing: ${delayMs}ms delay`);
    await new Promise(r => setTimeout(r, delayMs));
  }
}

// ==== PHASE 5: 90-SECOND CACHE ====
function generateCacheKey(params: {
  prompt: string;
  vibe: string;
  ageBand: string;
  model: string;
  context?: string;
  format?: string;
}): string {
  const keyData = `${params.prompt}|${params.vibe}|${params.ageBand}|${params.model}|${params.context || ''}|${params.format || ''}`;
  
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    const char = keyData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `gen_${Math.abs(hash).toString(36)}`;
}

async function checkRecentCache(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('recent_generations')
      .select('*')
      .eq('key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return JSON.parse(data.text);
  } catch (error) {
    console.log('Cache lookup failed:', error);
    return null;
  }
}

async function saveToRecentCache(
  supabase: any, 
  cacheKey: string, 
  result: any, 
  model: string, 
  usage: any
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();
    
    await supabase
      .from('recent_generations')
      .upsert({
        key: cacheKey,
        text: JSON.stringify(result),
        model,
        usage: usage || {},
        expires_at: expiresAt
      });
  } catch (error) {
    console.log('Cache save failed:', error);
  }
}

// ==== PHASE 6: STRUCTURED LOGGING ====
async function logAICall(
  supabase: any,
  params: {
    userId?: string;
    clientIp?: string;
    tokensIn?: number;
    tokensOut?: number;
    model: string;
    attempts: number;
    status: number;
    wasCached: boolean;
    wasCoalesced: boolean;
  }
): Promise<void> {
  try {
    await supabase
      .from('ai_call_logs')
      .insert({
        user_id: params.userId,
        client_ip: params.clientIp,
        tokens_in: params.tokensIn,
        tokens_out: params.tokensOut,
        model: params.model,
        attempts: params.attempts,
        status: params.status,
        was_cached: params.wasCached,
        was_coalesced: params.wasCoalesced
      });
  } catch (error) {
    console.log('AI call logging failed:', error);
  }
}

// ==== PHASE 7: IDEMPOTENCY HELPERS ====
function generateIdempotencyKey(params: { vibeTags: string[], context: string, format: string, ageBand?: string }): string {
  const normalized = {
    vibeTags: [...params.vibeTags].sort(),
    context: params.context,
    format: params.format,
    ageBand: params.ageBand || 'unknown'
  };
  
  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function createIdempotencyKey(userKey: string, baseKey: string): string {
  return `${userKey}::${baseKey}`;
}

function getUserKey(req: Request, userId?: string): string {
  if (userId) return userId;
  
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');
  
  const clientIp = forwarded?.split(',')[0].trim() || realIp || cfIp || 'unknown';
  return `ip:${clientIp}`;
}

// ==== CONTENT SAFETY & AGE POLICY ====
type AgeBand = '11-13' | '14-17' | '18+';

interface AgePolicy {
  ageBand: AgeBand;
  requireSchoolSafe: boolean;
  maxCreativity: number;
  allowedFormats: string[];
  allowedContexts: string[];
  canShare: boolean;
}

const CONTENT_BLOCKLIST = [
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss', 'fag', 'retard',
  'sex', 'sexy', 'hot', 'horny', 'porn', 'nude', 'naked', 'penis', 'vagina', 'boobs',
  'drunk', 'wasted', 'high', 'stoned', 'blazed', 'weed', 'pot', 'marijuana', 'cocaine',
  'kill', 'murder', 'gun', 'knife', 'weapon', 'suicide', 'terrorist', 'nazi'
];

const VIBES = {
  'praise': 'Create innovative compliment slang phrases that are positive and uplifting. Focus on celebrating achievements, talents, and positive qualities.',
  'hype': 'Generate high-energy excitement phrases that capture enthusiasm and celebration.',
  'food': 'Create food-inspired slang phrases that blend culinary culture with modern language.',
  'compliment': 'Generate fresh compliment phrases that sound genuine and positive.',
  'gentle-roast': 'Create witty but affectionate teasing phrases that show friendship through gentle humor.',
  'goofy': 'Generate playfully silly and lighthearted slang phrases that capture humor and fun.',
  'academic': 'Create intellectually inspired slang phrases that blend learning and creativity.',
  'gamer': 'Generate gaming-inspired slang phrases that capture video game culture.',
  'artsy': 'Create artistic and creative slang phrases that celebrate self-expression.',
  'sportsy': 'Generate sports-inspired slang phrases that capture athletic culture and team spirit.'
};

function getAgeSafetyPrompt(ageBand: AgeBand, schoolSafe: boolean): string {
  const baseRules = `
Safety Rules (STRICTLY ENFORCED):
- NO profanity, slurs, sexual content, harassment, or targeted insults
- NO references to drugs, alcohol, violence, self-harm, or illegal activities  
- NO hate speech, discrimination, or harmful stereotypes
- Keep examples conversational and natural
- Create positive, uplifting content only`;

  const ageSpecificRules = {
    '11-13': `${baseRules}
- EXTRA SAFE: Content must be appropriate for middle school students
- Focus on school, hobbies, friendship, and wholesome fun`,
    
    '14-17': `${baseRules}
- HIGH SCHOOL APPROPRIATE: Content suitable for teenagers
- Can include pop culture, trends, and age-appropriate humor`,
    
    '18+': `${baseRules}
- ADULT APPROPRIATE: More sophisticated language allowed
- Can reference college, work, and adult experiences`
  };

  return ageSpecificRules[ageBand];
}

async function getServerAgePolicy(userId: string): Promise<AgePolicy> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data } = await supabase.rpc('get_age_policy', { target_user_id: userId });
    
    if (data) {
      return {
        ageBand: data.ageBand,
        requireSchoolSafe: data.requireSchoolSafe,
        maxCreativity: data.maxCreativity,
        allowedFormats: data.allowedFormats,
        allowedContexts: data.allowedContexts,
        canShare: data.canShare
      };
    }
  } catch (error) {
    console.log('Failed to get server age policy:', error);
  }
  
  // Default to safest policy
  return {
    ageBand: '11-13',
    requireSchoolSafe: true,
    maxCreativity: 0.6,
    allowedFormats: ['word', 'short_phrase'],
    allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
    canShare: false
  };
}

// ==== CONTENT GENERATION ====
const slangJsonSchema = {
  type: "object",
  properties: {
    slang_items: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          phrase: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            description: "1-3 word slang phrase"
          },
          meaning: {
            type: "string", 
            minLength: 5,
            maxLength: 100,
            description: "Brief explanation (15-20 words maximum)"
          },
          example: {
            type: "string",
            minLength: 5,
            maxLength: 150,
            description: "Natural conversational sentence using the phrase"
          }
        },
        required: ["phrase", "meaning", "example"],
        additionalProperties: false
      }
    }
  },
  required: ["slang_items"],
  additionalProperties: false
};

async function moderateInput(text: string): Promise<{ flagged: boolean; categories?: string[] }> {
  try {
    const response = await withBackoff(async () => {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: text })
      });

      if (!res.ok) {
        const err: any = new Error(`Moderation API error: ${res.status}`);
        err.response = res;
        err.status = res.status;
        throw err;
      }

      return res;
    });

    const data = await response.json();
    const result = data.results[0];
    
    if (result.flagged) {
      const categories = result.categories || {};
      const flaggedCategories = Object.keys(categories).filter(
        cat => categories[cat]
      );
      return { flagged: true, categories: flaggedCategories };
    }
    
    return { flagged: false };
  } catch (error) {
    console.error('Input moderation failed:', error);
    return { flagged: false };
  }
}

async function generateSlang(
  vibeTags: string[], 
  context: string, 
  format: string, 
  enforcedParams: any, 
  supabase: any, 
  cacheKey: string
): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const vibeDescriptions = vibeTags.map(tag => VIBES[tag] || `Generate ${tag}-style slang`).join(' ');
  const safetyPrompt = getAgeSafetyPrompt(enforcedParams.ageBand, enforcedParams.schoolSafe);
  
  const systemPrompt = `You are SlangLab, a creative slang generator that creates safe, age-appropriate slang phrases.

${safetyPrompt}

Context: ${context}
Format: ${format}
Vibe: ${vibeDescriptions}

Generate 1-3 original slang phrases that are:
- Creative and unique
- Age-appropriate for ${enforcedParams.ageBand}
- School-safe: ${enforcedParams.schoolSafe}
- Fun and engaging

Return valid JSON matching the schema exactly.`;

  const requestBody = {
    model: "gpt-5-mini-2025-08-07",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create slang for: ${vibeTags.join(', ')}` }
    ],
    max_completion_tokens: 800,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "slang_generation",
        schema: slangJsonSchema,
        strict: true
      }
    }
  };

  let attempts = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  let resp: Response | null = null;
  try {
    resp = await withBackoff(async () => {
      attempts++;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const e: any = new Error(`OpenAI ${res.status}`);
        e.status = res.status;
        e.response = res;
        throw e;
      }

      return res;
    });

    // Apply header-aware pacing after successful request
    await applyRateLimitPacing(resp);

    const data = await resp.json();
    const usage = data.usage;
    tokensIn = usage?.prompt_tokens || 0;
    tokensOut = usage?.completion_tokens || 0;

    let content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    const creations = parsed.slang_items;

    // Save to 90s cache
    await saveToRecentCache(supabase, cacheKey, creations, "gpt-5-mini-2025-08-07", usage);

    return {
      creations,
      isFromAI: true,
      attempts,
      tokensIn,
      tokensOut
    };

  } catch (e: any) {
    // Enhance OpenAI error with response for better diagnostics
    e.response = resp;
    return await diagResponse(e, "openai");
  }
}

function getFallbackCreations(vibe: string): any[] {
  const fallbacks = {
    'praise': [
      {
        phrase: "stellar work",
        meaning: "Outstanding performance or achievement",
        example: "That presentation was stellar work!"
      }
    ],
    'hype': [
      {
        phrase: "absolute fire",
        meaning: "Something extremely good or impressive",
        example: "Your new project is absolute fire!"
      }
    ],
    'food': [
      {
        phrase: "chef's kiss",
        meaning: "Perfect or excellent",
        example: "That meal was chef's kiss!"
      }
    ]
  };

  return fallbacks[vibe] || fallbacks['praise'];
}

async function moderateCreations(creations: any[]): Promise<any[]> {
  if (!Array.isArray(creations)) return [];
  return creations.filter(creation => {
    const text = `${creation.phrase} ${creation.meaning} ${creation.example}`.toLowerCase();
    
    // Check against blocklist
    for (const term of CONTENT_BLOCKLIST) {
      if (text.includes(term.toLowerCase())) {
        console.log('Filtered creation for blocked content:', creation.phrase);
        return false;
      }
    }
    
    return true;
  });
}

// ==== LEGACY CACHE & DATABASE FUNCTIONS ====
async function checkCacheStrategy(userId: string | null, vibe: string, userPlan: string, userRole: string) {
  if (userRole === 'admin') {
    return { shouldUseCache: false, cacheEntry: null };
  }

  if (!userId) {
    const shouldUseCache = Math.random() < 0.8;
    if (!shouldUseCache) return { shouldUseCache: false, cacheEntry: null };
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cacheEntry } = await supabase
      .from('slang_cache')
      .select('*')
      .eq('vibe', vibe)
      .gte('quality_score', 70)
      .gt('expires_at', new Date().toISOString())
      .order('quality_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { shouldUseCache: true, cacheEntry };
  } catch (error) {
    console.log('Cache strategy check failed:', error);
    return { shouldUseCache: false, cacheEntry: null };
  }
}

async function saveToCacheDatabase(vibe: string, creations: any[]): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase
      .from('slang_cache')
      .upsert({
        vibe,
        phrases: creations,
        quality_score: 85,
        usage_count: 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
  } catch (error) {
    console.log('Cache save failed:', error);
  }
}

async function saveCreationsToDatabase(userId: string, vibe: string, creations: any[]): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const creation of creations) {
      await supabase
        .from('creations')
        .insert({
          user_id: userId,
          phrase: creation.phrase,
          meaning: creation.meaning,
          example: creation.example,
          vibe: vibe,
          creation_type: 'ai'
        });
    }
  } catch (error) {
    console.log('Database save failed:', error);
  }
}

async function updateGenerationLimits(userId: string): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('limits')
      .upsert({
        user_id: userId,
        date: today,
        generations_used: 1
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      });
  } catch (error) {
    console.log('Limit update failed:', error);
  }
}

// ==== MAIN SERVE FUNCTION ====
serve(async (req) => {
  // Prune old entries periodically
  if (Math.random() < 0.1) {
    pruneOldEntries();
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await readJsonSafe(req);
    // minimal debug: log only keys, never values
    try { console.log("[generate-slang] keys:", Object.keys(raw)); } catch {}

    // Back-compat aliases
    const promptAlias  = aliasString(raw, ["prompt","text","phrase","query","message","input","content"]);
    const vibeAlias    = aliasString(raw, ["vibe","mood","style"]);
    const ageBandAlias = aliasString(raw, ["ageBand","age","audience"]);

    // New shape fields
    const vibeTags = isStrArr(raw["vibeTags"]) ? (raw["vibeTags"] as string[]) : undefined;
    const context  = aliasString(raw, ["context","topic","theme"]);
    const format   = aliasString(raw, ["format","type","kind"]);
    const schoolSafe = isBool(raw["schoolSafe"]) ? (raw["schoolSafe"] as boolean) : true;
    const creativity = clamp01(raw["creativity"], 0.7);  // default 0.7

    const { userMsg, vibeOut } = buildPromptFromShape({
      prompt: promptAlias,
      vibe: vibeAlias,
      vibeTags,
      context,
      format,
      ageBand: ageBandAlias,
      schoolSafe
    });

    // Fail fast only if we have absolutely nothing to ask
    if (!nonEmpty(userMsg)) {
      const payload = { status: 400, error: "bad_request", detail: "Insufficient input to generate slang." };
      return new Response(JSON.stringify(payload), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Map creativity -> temperature
    const temperature = creativity; // 0..1 already clamped

    // Input moderation
    const inputText = userMsg;
    try {
      const moderation = await moderateInput(inputText);
      if (moderation.flagged) {
        return new Response(JSON.stringify({
          error: 'Input contains inappropriate content. Please try different terms.',
          categories: moderation.categories
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e: any) {
      return await diagResponse(e, "openai");
    }

    // (1) DERIVE IDEMPOTENCY + USER KEY
    const baseIdempotencyKey = req.headers.get('X-Idempotency-Key') || 
      generateIdempotencyKey({ vibeTags: vibeTags || [vibeOut || 'generic'], context: context || 'generic', format: format || 'word' });

    let userId: string | null = null;
    let userPlan = 'free';
    let userRole = 'member';
    let serverAgePolicy: AgePolicy;

    // Authentication
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          userId = user.id;

          // Get user profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, role')
            .eq('user_id', userId)
            .single();

          userPlan = profile?.plan || 'free';
          userRole = profile?.role || 'member';
          
          // Get server-side age policy
          serverAgePolicy = await getServerAgePolicy(userId);
        } else {
          serverAgePolicy = {
            ageBand: '11-13',
            requireSchoolSafe: true,
            maxCreativity: 0.6,
            allowedFormats: ['word', 'short_phrase'],
            allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
            canShare: false
          };
        }
      } catch (e: any) {
        return await diagResponse(e, "supabase");
      }
    } else {
      serverAgePolicy = {
        ageBand: '11-13',
        requireSchoolSafe: true,
        maxCreativity: 0.6,
        allowedFormats: ['word', 'short_phrase'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
        canShare: false
      };
    }

    // (2) EXTRACT USER KEY AND CREATE FINAL IDEMPOTENCY KEY
    const userKey = getUserKey(req, userId);
    const idempotencyKey = createIdempotencyKey(userKey, baseIdempotencyKey);

    // (3) INFLIGHT CHECK (await if duplicate)
    if (inflight.has(idempotencyKey)) {
      console.log('Returning in-flight result for idempotency key:', idempotencyKey);
      return await inflight.get(idempotencyKey)!.promise;
    }

    // (4) WRAP IN SINGLE-FLIGHT LOCK PER USER/IP
    const generationPromise = (async () => {
      return await withSingleFlight(userKey, async () => {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        // Variables for logging
        let wasCached = false;
        let wasCoalesced = false;
        let attempts = 1;

        // Rate limiting for authenticated users
        if (userId && userRole !== 'admin') {
          if (userPlan === 'labpro') {
            // LabPro users: 1 AI generation per day
            const today = new Date().toISOString().split('T')[0];
            
            const { data: limits } = await supabase
              .from('limits')
              .select('*')
              .eq('user_id', userId)
              .eq('date', today)
              .maybeSingle();

            const generationsUsed = limits?.generations_used || 0;

            if (generationsUsed >= 1) {
              return new Response(JSON.stringify({ 
                error: 'Daily AI generation limit reached. LabPro users get 1 AI creation per day.' 
              }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            // Free users: 1 AI generation per week
            const { data: weekStartData } = await supabase
              .rpc('get_week_start')
              .single();
            
            const weekStart = weekStartData;
            
            const { data: limits } = await supabase
              .from('limits')
              .select('*')
              .eq('user_id', userId)
              .eq('week_start_date', weekStart)
              .maybeSingle();

            const generationsUsed = limits?.generations_used || 0;

            if (generationsUsed >= 1) {
              return new Response(JSON.stringify({ 
                error: 'Weekly AI generation limit reached. Free users get 1 AI creation per week.' 
              }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        }

        // SERVER-SIDE POLICY ENFORCEMENT
        const enforcedParams = {
          ageBand: serverAgePolicy.ageBand,
          creativity: Math.min(Math.max(creativity, 0.1), serverAgePolicy.maxCreativity),
          schoolSafe: serverAgePolicy.requireSchoolSafe ? true : schoolSafe,
          format: serverAgePolicy.allowedFormats.includes(format ?? 'word') ? 
            format : serverAgePolicy.allowedFormats[0],
          context: serverAgePolicy.allowedContexts.includes(context ?? 'generic') ? 
            context : 'generic'
        };

        console.log('Enforced parameters:', enforcedParams);

        // (5) CHECK 90S CACHE
        const vibeTagsForCache = vibeTags || [vibeOut || 'generic'];
        const recentCacheKey = generateCacheKey({
          prompt: vibeTagsForCache.join(','),
          vibe: vibeTagsForCache[0],
          ageBand: enforcedParams.ageBand,
          model: 'gpt-5-mini-2025-08-07',
          context: enforcedParams.context,
          format: enforcedParams.format
        });

        const cachedResult = await checkRecentCache(supabase, recentCacheKey);
        if (cachedResult) {
          console.log('Using 90s cached content');
          wasCached = true;
          
          // (8) INSERT STRUCTURED LOG ROW
          await logAICall(supabase, {
            userId: userId || getUserKey(req),
            clientIp: getUserKey(req, userId).startsWith('ip:') ? getUserKey(req, userId).substring(3) : undefined,
            model: 'gpt-5-mini-2025-08-07',
            attempts: 0,
            status: 200,
            wasCached: true,
            wasCoalesced: false
          });
          
          return new Response(JSON.stringify({
            success: true,
            creations: cachedResult,
            message: 'Generated successfully (optimized)',
            cached: true,
            isFromAI: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Legacy cache fallback
        const cacheKey = vibeTagsForCache.join(',');
        const { shouldUseCache, cacheEntry } = await checkCacheStrategy(userId, cacheKey, userPlan, userRole);
        
        if (shouldUseCache && cacheEntry) {
          console.log('Using long-term cached content');
          wasCached = true;
          
          await logAICall(supabase, {
            userId: userId || getUserKey(req),
            clientIp: getUserKey(req, userId).startsWith('ip:') ? getUserKey(req, userId).substring(3) : undefined,
            model: 'gpt-5-mini-2025-08-07',
            attempts: 0,
            status: 200,
            wasCached: true,
            wasCoalesced: false
          });
          
          return new Response(JSON.stringify({
            success: true,
            creations: cacheEntry.phrases,
            message: 'Generated successfully (optimized)',
            cached: true,
            isFromAI: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // (6) CALL OPENAI VIA WITHBACKOFF
        console.log('Generating fresh AI content');
        const result = await generateSlang(vibeTagsForCache, enforcedParams.context, enforcedParams.format, enforcedParams, supabase, recentCacheKey);
        
        attempts = result.attempts || 1;

        // (7) MODERATE GENERATED CONTENT
        const moderatedCreations = await moderateCreations(Array.isArray(result.creations) ? result.creations : []);

        // (8) SAVE TO CACHE
        if (result.isFromAI && moderatedCreations.length > 0) {
          await saveToCacheDatabase(cacheKey, moderatedCreations);
        }

        // (9) INSERT STRUCTURED LOG ROW
        await logAICall(supabase, {
          userId: userId || getUserKey(req),
          clientIp: getUserKey(req, userId).startsWith('ip:') ? getUserKey(req, userId).substring(3) : undefined,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          model: 'gpt-5-mini-2025-08-07',
          attempts: attempts,
          status: 200,
          wasCached: wasCached,
          wasCoalesced: wasCoalesced
        });

        // Save to database if user is authenticated
        if (userId) {
          await saveCreationsToDatabase(userId, cacheKey, moderatedCreations);
          await updateGenerationLimits(userId);
        }

        const response = {
          creations: moderatedCreations,
          isFromAI: result.isFromAI,
          message: result.isFromAI 
            ? 'Fresh AI-generated slang created just for you!'
            : result.error || 'Using creative fallback content',
          canRetry: !result.isFromAI && result.error?.includes('rate limit')
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      });
    })();

    // Store the promise in inflight map for idempotency  
    inflight.set(idempotencyKey, { promise: generationPromise, started: Date.now() });

    try {
      return await generationPromise;
    } finally {
      // (10) CLEANUP INFLIGHT + LOCKS
      inflight.delete(idempotencyKey);
    }

  } catch (e: any) {
    // Global error handler - catch any unexpected errors
    return await diagResponse(e, "unknown", 500);
  }
});