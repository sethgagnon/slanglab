import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Idempotency and Single-Flight Protection Infrastructure
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

// Generate stable hash from request parameters
function generateIdempotencyKey(params: { vibeTags: string[], context: string, format: string, ageBand?: string }): string {
  const normalized = {
    vibeTags: [...params.vibeTags].sort(),
    context: params.context,
    format: params.format,
    ageBand: params.ageBand || 'unknown'
  };
  
  const str = JSON.stringify(normalized);
  // Simple hash implementation for Deno
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Create idempotency key combining user and request
function createIdempotencyKey(userKey: string, baseKey: string): string {
  return `${userKey}::${baseKey}`;
}

// Single-flight protection with timeout
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

// Extract user key for identification
function getUserKey(req: Request, userId?: string): string {
  if (userId) return userId;
  
  // Try to get real IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');
  
  const clientIp = forwarded?.split(',')[0].trim() || realIp || cfIp || 'unknown';
  return `ip:${clientIp}`;
}

// Robust retry function with exponential backoff + jitter
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
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Phase 1: Safety Backbone + Age Controls - Enhanced Content Policy
type AgeBand = '11-13' | '14-17' | '18+';

interface AgePolicy {
  ageBand: AgeBand;
  requireSchoolSafe: boolean;
  maxCreativity: number;
  allowedFormats: string[];
  allowedContexts: string[];
  canShare: boolean;
}

// Content blocklist patterns - Enhanced for Phase 3
const CONTENT_BLOCKLIST = [
  // Profanity and slurs (expanded)
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss', 'fag', 'retard',
  'fck', 'fuk', 'sh*t', 'sh1t', 'b*tch', 'b1tch', 'd*mn', 'd@mn', 'h*ll', 'h3ll', '@ss', 'a$$',
  'f.u.c.k', 's.h.i.t', 'b.i.t.c.h', 'a.s.s',
  
  // Sexual content (expanded)
  'sex', 'sexy', 'hot', 'horny', 'porn', 'nude', 'naked', 'penis', 'vagina', 'boobs', 'tits',
  'orgasm', 'masturbate', 'dildo', 'vibrator', 'anal', 'oral', 'cum', 'jizz', 'sperm',
  's3x', 's3xy', 'h0t', 'h07', 'p0rn', 'p*rn', 'n@ked', 'nak3d', 'b00bs', 'b00b5',
  's.e.x', 'p.o.r.n', 'n.u.d.e',
  
  // Drugs and alcohol (expanded)
  'drunk', 'wasted', 'high', 'stoned', 'blazed', 'lit', 'turnt', 'hammered', 'fucked up',
  'beer', 'wine', 'vodka', 'whiskey', 'tequila', 'rum', 'gin', 'alcohol', 'booze', 'liquor',
  'weed', 'pot', 'marijuana', 'cannabis', 'grass', 'herb', 'joint', 'blunt', 'bong', 'dab',
  'cocaine', 'coke', 'crack', 'heroin', 'meth', 'ecstasy', 'molly', 'acid', 'lsd', 'shrooms',
  'd*nk', 'w33d', 'p0t', 'w33d', 'mar1juana', 'c0caine', 'c0ke', 'h3roin', 'm3th',
  'd.r.u.n.k', 'w.e.e.d', 'c.o.k.e',
  
  // Violence and weapons (expanded)
  'kill', 'murder', 'gun', 'knife', 'weapon', 'shoot', 'stab', 'bomb', 'grenade', 'pistol',
  'rifle', 'shotgun', 'blade', 'sword', 'machete', 'axe', 'hammer', 'club', 'bat',
  'suicide bomber', 'terrorist', 'assassin', 'hitman', 'serial killer',
  'k*ll', 'k1ll', 'murd3r', 'sh00t', 'sh007', 'b0mb', 'p1stol', 'r1fle',
  'k.i.l.l', 'm.u.r.d.e.r', 's.h.o.o.t',
  
  // Self-harm and mental health (expanded)
  'suicide', 'kill myself', 'end it all', 'cutting', 'self harm', 'hurt myself', 'razor',
  'depression', 'anxiety', 'ptsd', 'bipolar', 'schizophrenia', 'eating disorder',
  'anorexia', 'bulimia', 'self injury', 'overdose',
  'su*c*de', 'su1c1de', 'd3pr3ss10n', 'anx13ty', 'cut71ng',
  's.u.i.c.i.d.e', 'c.u.t.t.i.n.g',
  
  // Hate speech and slurs (expanded)
  'nigger', 'nigga', 'faggot', 'dyke', 'tranny', 'chink', 'gook', 'spic', 'wetback',
  'kike', 'kyke', 'sand nigger', 'towelhead', 'raghead', 'terrorist', 'jihad',
  'nazi', 'hitler', 'holocaust', 'kkk', 'white power', 'white supremacy',
  'n*gger', 'n1gger', 'f@ggot', 'f@g', 'tr@nny', 'ch1nk', 'g00k', 'sp1c',
  'n.i.g.g.e.r', 'f.a.g.g.o.t', 'n.a.z.i',
  
  // General offensive terms
  'whore', 'slut', 'prostitute', 'hooker', 'pimp', 'pedophile', 'rapist', 'molester',
  'wh0re', 'sl*t', 'pr0stitute', 'h00ker', 'p3dophile', 'rap1st',
  'w.h.o.r.e', 's.l.u.t'
];

const CONTENT_BLOCKLIST_REGEX = [
  // Enhanced leetspeak and obfuscation patterns
  /[s5$][h3][i1!][t7+]/gi, // shit variations
  /[f][u][c][k]/gi,        // fuck variations  
  /[b][i1!][t7+][c][h3]/gi, // bitch variations
  /[a@4][s5$]{2,}/gi,      // ass variations
  /[d][a@4][m][n]/gi,      // damn variations
  /[n][i1!][g9][g9][e3][r]/gi, // n-word variations
  /[f][a@4][g9]{2}[o0][t7+]/gi, // f-word slur variations
  
  // Sexual content patterns (enhanced)
  /[s5$][e3][x]/gi,        // sex variations
  /[p][o0][r][n]/gi,       // porn variations
  /[n][u][d][e3]/gi,       // nude variations
  /[h][o0][r][n][y]/gi,    // horny variations
  /[o0][r][g9][a@4][s5$][m]/gi, // orgasm variations
  
  // Drug patterns (enhanced)
  /[w][e3]{2}[d]/gi,       // weed variations
  /[h][i1!][g9][h3]/gi,    // high variations (context-dependent)
  /[s5$][t7+][o0][n][e3][d]/gi, // stoned variations
  /[c][o0][c][a@4][i1!][n][e3]/gi, // cocaine variations
  /[h3][e3][r][o0][i1!][n]/gi, // heroin variations
  /[m][e3][t7+][h3]/gi,    // meth variations
  
  // Violence patterns (enhanced)
  /[k][i1!][l]{2}/gi,      // kill variations
  /[m][u][r][d][e3][r]/gi, // murder variations
  /[s5$][h3][o0]{2}[t7+]/gi, // shoot variations
  /[b][o0][m][b]/gi,       // bomb variations
  /[g9][u][n]/gi,          // gun variations
  /[k][n][i1!][f][e3]/gi,  // knife variations
  
  // Self-harm patterns
  /[s5$][u][i1!][c][i1!][d][e3]/gi, // suicide variations
  /[c][u][t7+]{2}[i1!][n][g9]/gi,  // cutting variations
  /[s5$][e3][l][f][\s\.\-_]*[h3][a@4][r][m]/gi, // self harm variations
  
  // Hate speech patterns
  /[n][a@4][z][i1!]/gi,    // nazi variations
  /[h3][i1!][t7+][l][e3][r]/gi, // hitler variations
  /[t7+][e3][r]{2}[o0][r][i1!][s5$][t7+]/gi, // terrorist variations
  
  // Advanced obfuscation patterns
  /(.)\1{4,}/gi,           // Repeated characters (aaaa, 1111)
  /[0-9@$!#%^&*]{3,}/gi,   // Excessive special chars/numbers
  /[\.\-_\s]{2,}/gi,       // Multiple dots/dashes/spaces for separation
  /[aeiou]/gi,             // Vowel removal patterns (common obfuscation)
  /([a-z])\1+/gi,          // Character repetition (heeello)
  /\b[a-z]*[0-9]+[a-z]*\b/gi, // Mixed numbers in words
  /[^a-zA-Z0-9\s]{2,}/gi   // Multiple special characters together
];

// OpenAI Structured Output Schema for 1-3 safe items
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
          },
          usage_examples: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "string",
              minLength: 5,
              maxLength: 150
            },
            description: "1-2 additional usage examples"
          },
          part_of_speech: {
            type: "string",
            maxLength: 20,
            description: "Part of speech (noun, verb, adjective, etc.)"
          },
          notes_for_moderator: {
            type: "string",
            maxLength: 200,
            description: "Brief explanation of why this content is safe and appropriate"
          }
        },
        required: ["phrase", "meaning", "example", "usage_examples", "part_of_speech", "notes_for_moderator"],
        additionalProperties: false
      }
    }
  },
  required: ["slang_items"],
  additionalProperties: false
};

// Age-aware vibe prompts with enhanced safety
const VIBES = {
  'praise': 'Create innovative compliment slang phrases that are positive and uplifting. Focus on celebrating achievements, talents, and positive qualities. Use creative wordplay and fresh combinations. Keep language family-friendly and school-appropriate.',
  'hype': 'Generate high-energy excitement phrases that capture enthusiasm and celebration. Think achievements, accomplishments, and positive moments. Use creative compounds and energetic language while maintaining appropriateness.',
  'food': 'Create food-inspired slang phrases that blend culinary culture with modern language. Focus on cooking, flavors, and food experiences. Use appetizing metaphors and food culture references in a fun, clean way.',
  'compliment': 'Generate fresh compliment phrases that sound genuine and positive. Focus on personality traits, talents, and positive characteristics. Use uplifting metaphors and encouraging language.',
  'gentle-roast': 'Create witty but affectionate teasing phrases that show friendship through gentle humor. Think harmless, endearing observations about quirks and habits. Keep it loving and fun without any mean-spirited content.',
  'goofy': 'Generate playfully silly and lighthearted slang phrases that capture humor and fun. Focus on amusing situations, quirky behaviors, and endearing goofiness. Use whimsical wordplay while keeping content appropriate and joyful.',
  'academic': 'Create intellectually inspired slang phrases that blend learning and creativity. Focus on study culture, academic achievements, and scholarly pursuits. Use clever academic references and educational metaphors in a fun, approachable way.',
  'gamer': 'Generate gaming-inspired slang phrases that capture video game culture and digital experiences. Focus on achievements, gameplay moments, and gaming community language. Use creative gaming metaphors while keeping content inclusive.',
  'artsy': 'Create artistic and creative slang phrases that celebrate self-expression and creativity. Focus on artistic pursuits, creative processes, and aesthetic experiences. Use imaginative metaphors and creative language.',
  'sportsy': 'Generate sports-inspired slang phrases that capture athletic culture and team spirit. Focus on competition, teamwork, achievements, and sporting moments. Use dynamic sports metaphors while promoting positive sportsmanship.',
};

// Age-specific safety prompts
function getAgeSafetyPrompt(ageBand: AgeBand, schoolSafe: boolean): string {
  const baseRules = `
Safety Rules (STRICTLY ENFORCED):
- NO profanity, slurs, sexual content, harassment, or targeted insults
- NO references to drugs, alcohol, violence, self-harm, or illegal activities  
- NO hate speech, discrimination, or harmful stereotypes
- Keep examples conversational and natural
- Create positive, uplifting content only`;

  const ageSpecificRules = {
    '11-13': `
${baseRules}
- EXTRA SAFE: Content must be appropriate for middle school students
- Focus on school, hobbies, friendship, and wholesome fun
- Use simple, clear language
- Educational or encouraging themes preferred`,
    
    '14-17': `
${baseRules}
- HIGH SCHOOL APPROPRIATE: Content suitable for teenagers
- Can include pop culture, trends, and age-appropriate humor
- School-safe language required
- Focus on interests like music, sports, fashion, gaming`,
    
    '18+': schoolSafe ? `
${baseRules}
- COLLEGE/WORKPLACE SAFE: Professional yet creative language
- Can reference adult interests but keep family-friendly
- Suitable for academic or work environments` : `
${baseRules}
- YOUNG ADULT APPROPRIATE: Creative but responsible language
- Can be more expressive while maintaining respect
- Still family-friendly but allows more sophisticated humor`
  };

  return ageSpecificRules[ageBand] || ageSpecificRules['11-13'];
}

// Function to get age policy from database (server-side enforcement)
async function getServerAgePolicy(userId: string): Promise<AgePolicy> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data, error } = await supabase.rpc('get_age_policy', { 
      target_user_id: userId 
    });

    if (error || !data) {
      console.log('No age policy found, defaulting to safest (11-13)');
      return {
        ageBand: '11-13',
        requireSchoolSafe: true,
        maxCreativity: 0.6,
        allowedFormats: ['word', 'short_phrase'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
        canShare: false
      };
    }

    return data as AgePolicy;
  } catch (error) {
    console.error('Error fetching age policy:', error);
    // Default to safest policy on error
    return {
      ageBand: '11-13',
      requireSchoolSafe: true,
      maxCreativity: 0.6,
      allowedFormats: ['word', 'short_phrase'],
      allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
      canShare: false
    };
  }
}

// Input moderation using OpenAI
async function moderateInput(text: string): Promise<{ flagged: boolean; reason?: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.warn('OpenAI API key not available for input moderation');
    return { flagged: false };
  }

  try {
    const response = await withBackoff(async () => {
      const resp = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'omni-moderation-latest'
        }),
      });
      
      if (!resp.ok) {
        const e: any = new Error(`OpenAI Moderation ${resp.status}`);
        e.status = resp.status;
        e.response = resp;
        throw e;
      }
      return resp;
    });

    if (!response.ok) {
      console.warn('Moderation API failed, allowing content');
      return { flagged: false };
    }

    const data = await response.json();
    const result = data.results?.[0];
    
    if (result?.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);
      
      return { 
        flagged: true, 
        reason: `Content flagged for: ${categories.join(', ')}` 
      };
    }

    return { flagged: false };
  } catch (error) {
    console.error('Error in input moderation:', error);
    return { flagged: false }; // Allow on error, rely on other safety measures
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Store request context for API logging
  globalThis.currentRequest = req;

  // Prune old entries on each request to prevent memory leaks
  pruneOldEntries();

  try {
    // Enhanced input validation with age-aware parameters  
    const body = await req.json();
    const { 
      vibeTags, 
      context,
      format,
      ageBand: clientAgeBand, 
      schoolSafe: clientSchoolSafe, 
      creativity: clientCreativity
    } = body;

    // Extract idempotency key from header or generate from request
    const headerIdempotencyKey = req.headers.get('X-Idempotency-Key');
    const baseIdempotencyKey = headerIdempotencyKey || generateIdempotencyKey({ 
      vibeTags, 
      context, 
      format, 
      ageBand: clientAgeBand 
    });
    
    if (!vibeTags || !Array.isArray(vibeTags) || vibeTags.length === 0) {
      return new Response(JSON.stringify({ error: 'Vibe tags are required and must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!context || typeof context !== 'string') {
      return new Response(JSON.stringify({ error: 'Context is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!format || typeof format !== 'string') {
      return new Response(JSON.stringify({ error: 'Format is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate vibes
    const invalidVibes = vibeTags.filter(vibe => !VIBES[vibe as keyof typeof VIBES]);
    if (invalidVibes.length > 0) {
      return new Response(JSON.stringify({ error: `Invalid vibes: ${invalidVibes.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input moderation check for all vibes
    for (const vibe of vibeTags) {
      const moderationResult = await moderateInput(vibe);
      if (moderationResult.flagged) {
        console.log('Input flagged by moderation:', moderationResult.reason);
        return new Response(JSON.stringify({ 
          error: 'Input contains inappropriate content. Please try a different request.',
          reason: 'content_policy_violation'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Generating slang for vibes:', vibeTags, 'context:', context, 'format:', format);

    const authHeader = req.headers.get('authorization');
    let userId = null;
    let userPlan = 'free';
    let userRole = 'member';
    let serverAgePolicy: AgePolicy;

    // Check authentication and usage limits
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        userId = user.id;

    // Extract user key and create final idempotency key
    const userKey = getUserKey(req, userId);
    const idempotencyKey = createIdempotencyKey(userKey, baseIdempotencyKey);

    // Check if this exact request is already in-flight
    if (inflight.has(idempotencyKey)) {
      console.log('Returning in-flight result for idempotency key:', idempotencyKey);
      return await inflight.get(idempotencyKey)!.promise;
    }

    // Create the main generation promise with single-flight protection
    const generationPromise = (async () => {
      return await withSingleFlight(userKey, async () => {
        // Continue with existing authentication and generation logic
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        if (userId) {
          // Get user profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, role')
            .eq('user_id', userId)
            .single();

        userPlan = profile?.plan || 'free';
        userRole = profile?.role || 'member';
        
        // Get server-side age policy (AUTHORITATIVE - never trust client)
        serverAgePolicy = await getServerAgePolicy(userId);
        
        // Admin users have unlimited generations
        if (userRole === 'admin') {
          // Skip all limits for admin users
        } else if (userPlan === 'labpro') {
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
              error: 'Daily AI generation limit reached. LabPro users get 1 AI creation per day. Try again tomorrow or create manual entries (unlimited).' 
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
              error: 'Weekly AI generation limit reached. Free users get 1 AI creation per week. Upgrade to LabPro for daily AI generations and unlimited manual creations.' 
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } else {
        // Anonymous user - default to safest policy
        serverAgePolicy = {
          ageBand: '11-13',
          requireSchoolSafe: true,
          maxCreativity: 0.6,
          allowedFormats: ['word', 'short_phrase'],
          allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
          canShare: false,
        };
      }
    } else {
      // No authentication - default to safest policy
      serverAgePolicy = {
        ageBand: '11-13',
        requireSchoolSafe: true,
        maxCreativity: 0.6,
        allowedFormats: ['word', 'short_phrase'],
        allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
        canShare: false
      };
    }

    // SERVER-SIDE POLICY ENFORCEMENT (Never trust client data)
    console.log('Applying server-side age policy:', serverAgePolicy);
    
    const enforcedParams = {
      ageBand: serverAgePolicy.ageBand,
      creativity: Math.min(Math.max(clientCreativity ?? 0.7, 0.1), serverAgePolicy.maxCreativity),
      schoolSafe: serverAgePolicy.requireSchoolSafe ? true : (clientSchoolSafe ?? true),
      format: serverAgePolicy.allowedFormats.includes(format ?? 'word') ? 
        format : serverAgePolicy.allowedFormats[0],
      context: serverAgePolicy.allowedContexts.includes(context ?? 'generic') ? 
        context : 'generic'
    };

    console.log('Enforced parameters:', enforcedParams);

    // Smart cache strategy check
    const cacheKey = vibeTags.join(',');
    const { shouldUseCache, cacheEntry } = await checkCacheStrategy(userId, cacheKey, userPlan, userRole);
    
    if (shouldUseCache && cacheEntry) {
      console.log('Using cached content for user:', userId);
      return new Response(
        JSON.stringify({
          success: true,
          creations: cacheEntry.phrases,
          message: 'Generated successfully (optimized)',
          cached: true,
          isFromAI: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate fresh AI content with age-aware parameters
    console.log('Generating fresh AI content for user:', userId);
    const result = await generateSlang(vibeTags, context, format, enforcedParams);
    console.log('Generated result:', result);

    // Moderate the generated content
    const moderatedCreations = await moderateCreations(result.creations);
    console.log('Moderated creations:', moderatedCreations);

    // Save to cache if we got AI content
    if (result.isFromAI && moderatedCreations.length > 0) {
      await saveToCacheDatabase(cacheKey, moderatedCreations);
    }

    // Phase 3: Log lightweight analytics (no PII)
    const analytics = {
      ageBand: enforcedParams.ageBand,
      vibeCount: vibeTags.length,
      context: enforcedParams.context,
      format: enforcedParams.format,
      itemCount: moderatedCreations.length,
      schoolSafe: enforcedParams.schoolSafe,
      timestamp: new Date().toISOString(),
      cached: shouldUseCache
    };
    console.info('SlangLab Analytics:', JSON.stringify(analytics));

    // Save to database if user is authenticated
    if (userId) {
      await saveCreationsToDatabase(userId, cacheKey, moderatedCreations);
      await updateGenerationLimits(userId);
    }

    // Provide detailed response with generation status
    const response = {
      creations: moderatedCreations,
      isFromAI: result.isFromAI,
      message: result.isFromAI 
        ? 'Fresh AI-generated slang created just for you!'
        : result.error || 'Using creative fallback content - try again in a moment for fresh AI results!',
      canRetry: !result.isFromAI && result.error?.includes('rate limit')
    };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        } else {
          // Handle anonymous/unauthenticated users with safe defaults
          serverAgePolicy = {
            ageBand: '11-13',
            requireSchoolSafe: true,
            maxCreativity: 0.6,
            allowedFormats: ['word', 'short_phrase'],
            allowedContexts: ['homework', 'food', 'sports', 'gaming', 'music', 'generic'],
            canShare: false
          };

          const enforcedParams = {
            ageBand: serverAgePolicy.ageBand,
            creativity: Math.min(Math.max(clientCreativity ?? 0.7, 0.1), serverAgePolicy.maxCreativity),
            schoolSafe: serverAgePolicy.requireSchoolSafe ? true : (clientSchoolSafe ?? true),
            format: serverAgePolicy.allowedFormats.includes(format ?? 'word') ? 
              format : serverAgePolicy.allowedFormats[0],
            context: serverAgePolicy.allowedContexts.includes(context ?? 'generic') ? 
              context : 'generic'
          };

          console.log('Anonymous user enforced parameters:', enforcedParams);

          // Generate content with fallback for anonymous users
          const result = await generateSlang(vibeTags, context, format, enforcedParams);
          const moderatedCreations = await moderateCreations(result.creations);

          const response = {
            creations: moderatedCreations,
            isFromAI: result.isFromAI,
            message: result.isFromAI 
              ? 'Fresh AI-generated slang created just for you!'
              : result.error || 'Using creative fallback content - try again in a moment for fresh AI results!',
            canRetry: !result.isFromAI && result.error?.includes('rate limit')
          };

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      });
    })();

    // Store the promise in inflight map for idempotency  
    inflight.set(idempotencyKey, { promise: generationPromise, started: Date.now() });

    try {
      return await generationPromise;
    } finally {
      // Always cleanup inflight entry
      inflight.delete(idempotencyKey);
    }

  } catch (error) {
    console.error('Error in generate-slang function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Smart cache strategy function
async function checkCacheStrategy(userId: string | null, vibe: string, userPlan: string, userRole: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Admin users get fresh content
    if (userRole === 'admin') {
      return { shouldUseCache: false, cacheEntry: null };
    }

    // Anonymous users get high cache hit rate
    if (!userId) {
      const shouldUseCache = Math.random() < 0.8; // 80% cache for anonymous
      if (!shouldUseCache) return { shouldUseCache: false, cacheEntry: null };
    } else {
      // Get user cache preference
      const { data: preference } = await supabase
        .from('user_generation_preferences')
        .select('cache_preference')
        .eq('user_id', userId)
        .maybeSingle();

      const cachePreference = preference?.cache_preference || 'balanced';

      // Define cache hit rates based on plan and preference
      let cacheHitRate = 0.5; // Default balanced
      if (userPlan === 'free') {
        cacheHitRate = cachePreference === 'fresh' ? 0.4 : 0.7;
      } else if (userPlan === 'searchpro') {
        cacheHitRate = cachePreference === 'fresh' ? 0.3 : 0.5;
      } else if (userPlan === 'labpro') {
        cacheHitRate = cachePreference === 'fresh' ? 0.2 : 0.3;
      }

      // Random decision based on cache hit rate
      const shouldUseCache = Math.random() < cacheHitRate;
      
      if (!shouldUseCache) {
        return { shouldUseCache: false, cacheEntry: null };
      }
    }

    // Clean expired cache entries first
    await supabase
      .from('slang_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Try to get high-quality cached content
    const { data: cacheEntry } = await supabase
      .from('slang_cache')
      .select('*')
      .eq('vibe', vibe)
      .gt('expires_at', new Date().toISOString())
      .order('quality_score', { ascending: false })
      .order('usage_count', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (cacheEntry) {
      // Update usage count and extend expiry
      await supabase
        .from('slang_cache')
        .update({ 
          usage_count: cacheEntry.usage_count + 1,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Extend by 2 hours
        })
        .eq('id', cacheEntry.id);
      
      return { shouldUseCache: true, cacheEntry };
    }

    return { shouldUseCache: false, cacheEntry: null };
  } catch (error) {
    console.error('Error in cache strategy:', error);
    return { shouldUseCache: false, cacheEntry: null };
  }
}

// Function to save content to cache
async function saveToCacheDatabase(vibe: string, creations: any[]) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Don't save if we don't have enough creations
    if (!creations || creations.length === 0) {
      return;
    }

    // Save new cache entry
    await supabase
      .from('slang_cache')
      .insert({
        vibe,
        phrases: creations,
        quality_score: 5, // Start with medium quality
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour expiry
      });
      
    console.log(`Saved ${creations.length} creations to cache for vibe: ${vibe}`);
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

// Function to get fallback from cache
async function getFallbackFromCache(vibe: string): Promise<any[] | null> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cacheEntry } = await supabase
      .from('slang_cache')
      .select('phrases')
      .eq('vibe', vibe)
      .order('quality_score', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    return cacheEntry?.phrases || null;
  } catch (error) {
    console.error('Error getting fallback from cache:', error);
    return null;
  }
}

async function generateSlang(
  vibeTags: string[],
  context: string,
  format: string,
  params: {
    ageBand: AgeBand;
    creativity: number;
    schoolSafe: boolean;
  },
  retryCount = 0
): Promise<{ creations: any[], isFromAI: boolean, error?: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured');
    // Try cache fallback first
    const fallbackFromCache = await getFallbackFromCache(vibeTags.join(','));
    if (fallbackFromCache) {
      return { creations: fallbackFromCache, isFromAI: false, error: 'OpenAI API key not configured - using cached content' };
    }
    return { 
      creations: getFallbackCreations(vibeTags[0]), 
      isFromAI: false,
      error: 'OpenAI API key not configured' 
    };
  }

  const vibePrompts = vibeTags.map(vibe => VIBES[vibe as keyof typeof VIBES]).join(' + ');
  const ageSafetyPrompt = getAgeSafetyPrompt(params.ageBand, params.schoolSafe);
  
  // Format-specific instructions
  const formatInstructions = {
    'word': 'Create single-word slang terms',
    'short_phrase': 'Create 2-3 word slang phrases', 
    'emoji_word_mash': 'Create creative combinations of words and emojis'
  };
  
  const systemPrompt = `Create exactly 3 unique slang terms with these combined vibes: "${vibePrompts}" in the context of "${context}".

Format requirement: ${formatInstructions[format as keyof typeof formatInstructions] || 'Create short slang phrases'}

${ageSafetyPrompt}

Important requirements:
- Each term should capture the combined vibe feeling: ${vibePrompts}
- Focus specifically on ${context}-related terminology
- Provide clear, concise definitions (15-20 words)
- Include the main usage example plus 1-2 additional usage examples
- Include part of speech (noun, verb, adjective, etc.)
- Add brief notes explaining why each term is safe and appropriate
- Creativity level: ${params.creativity} (0 = very conservative, 1 = highly creative)
- Make terms distinctive and memorable for ${context} context
- Ensure all content is appropriate for age group: ${params.ageBand}
${params.schoolSafe ? '- Content must be school-appropriate' : ''}

Focus on creating fresh, authentic slang that captures the combined "${vibePrompts}" feeling in ${context} situations while being completely safe and appropriate.`;

  try {
    const apiCallStart = Date.now();
    const response = await withBackoff(async () => {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Generate ${params.ageBand} age-appropriate slang with vibes: "${vibeTags.join(', ')}", context: "${context}", format: "${format}". School-safe: ${params.schoolSafe}. Return JSON only.`
            }
          ],
          max_completion_tokens: 800, // Reduced for 1-3 items instead of 5
          temperature: 0.8, // Fixed creativity for consistency
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "slang_generation",
              strict: true,
              schema: slangJsonSchema
            }
          }
        }),
      });
      
      if (!resp.ok) {
        const e: any = new Error(`OpenAI ${resp.status}`);
        e.status = resp.status;
        e.response = resp;
        throw e;
      }
      return resp;
    });
    const apiCallEnd = Date.now();

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Log successful API call
    await logAPIUsage({
      api_provider: 'openai',
      api_endpoint: 'chat/completions',
      request_type: 'generation', 
      status: response.status,
      processing_time_ms: apiCallEnd - apiCallStart,
      request_data: { model: 'gpt-5-mini-2025-08-07', vibes: vibeTags, context, format, ageBand: params.ageBand },
      response_data: { 
        usage: data.usage,
        model: data.model 
      },
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
      estimated_cost: calculateOpenAICost(data.usage?.total_tokens || 0, 'gpt-5-mini-2025-08-07')
    });
    
    try {
      const parsed = JSON.parse(content);
      const slangItems = parsed.slang_items || parsed; // Handle both formats
      
      if (!Array.isArray(slangItems) || slangItems.length === 0) {
        throw new Error('Invalid response format - no slang items');
      }
      
      // Validate each item has required fields and map to include new fields
      const validCreations = slangItems.filter(item => 
        item.phrase && item.meaning && item.example &&
        typeof item.phrase === 'string' && 
        typeof item.meaning === 'string' && 
        typeof item.example === 'string'
      ).map(item => ({
        phrase: item.phrase,
        meaning: item.meaning,
        example: item.example,
        usage_examples: item.usage_examples || [],
        part_of_speech: item.part_of_speech || '',
        notes_for_moderator: item.notes_for_moderator || '',
        safeFlag: true
      }));
      
      if (validCreations.length === 0) {
        throw new Error('No valid creations in response');
      }
      
      console.log(`Successfully generated ${validCreations.length} fresh AI content items`);
      return { creations: validCreations, isFromAI: true };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // Try cache fallback before predefined
      const fallbackFromCache = await getFallbackFromCache(vibeTags.join(','));
      if (fallbackFromCache) {
        return { creations: fallbackFromCache, isFromAI: false, error: 'Invalid AI response - using cached content' };
      }
      
      return { 
        creations: getFallbackCreations(vibeTags[0]), 
        isFromAI: false,
        error: 'Invalid AI response format'
      };
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Log failed API call after retry exhaustion
    await logAPIUsage({
      api_provider: 'openai',
      api_endpoint: 'chat/completions',
      request_type: 'generation',
      status: error?.status ?? 429,
      error_message: `OpenAI API error after retries: ${error?.message}`,
      processing_time_ms: Date.now() - Date.now(), // Will be recalculated
      request_data: { model: 'gpt-5-mini-2025-08-07', vibe: vibeTags.join(','), ageBand: params.ageBand },
      estimated_cost: 0.01
    });
    
    // Enhanced fallback - try cache first, then predefined
    const fallbackFromCache = await getFallbackFromCache(vibeTags.join(','));
    if (fallbackFromCache) {
      console.log('Using cache fallback due to error');
      return { creations: fallbackFromCache, isFromAI: false, error: 'API error - using cached content' };
    }
    
    console.log('Using predefined fallback due to error');
    const errorMsg = error?.status === 429 
      ? 'OpenAI rate limit exceeded. Using creative fallback content.' 
      : `OpenAI API error: ${error?.message || 'Unknown error'}`;
        
    return { 
      creations: getFallbackCreations(vibeTags[0]), 
      isFromAI: false,
      error: errorMsg
    };
  }
}

function getFallbackCreations(vibe: string) {
  // Enhanced fallback collections with more variety
  const vibeSpecificFallbacks = {
    'praise': [
      {
        phrase: 'aesthetic architect',
        meaning: 'someone who effortlessly curates beautiful vibes and experiences in their daily life',
        example: 'You\'re such an aesthetic architect - your whole setup is giving main character energy.'
      },
      {
        phrase: 'serotonin supplier',
        meaning: 'a person whose presence instantly boosts everyone\'s mood and positive energy levels',
        example: 'Thanks for being my daily serotonin supplier when work gets chaotic.'
      },
      {
        phrase: 'vibe calibrator',
        meaning: 'a person who naturally adjusts the energy of any room to match what\'s needed',
        example: 'She\'s the ultimate vibe calibrator - always knows exactly what the moment requires.'
      },
      {
        phrase: 'energy curator',
        meaning: 'someone who expertly manages and elevates the atmosphere wherever they go',
        example: 'You\'re like an energy curator - turning every hangout into something special.'
      },
      {
        phrase: 'mood alchemist',
        meaning: 'a person who magically transforms negative situations into positive experiences',
        example: 'That mood alchemist just turned our disaster into the best night ever.'
      }
    ],
    'hype': [
      {
        phrase: 'legendary specimen',
        meaning: 'someone who consistently does remarkable things that leave everyone genuinely impressed',
        example: 'That presentation was incredible - you\'re honestly a legendary specimen at this point.'
      },
      {
        phrase: 'apex achiever',
        meaning: 'a person who reaches the highest level of success in everything they attempt',
        example: 'Look at that apex achiever crushing another impossible deadline.'
      },
      {
        phrase: 'victory generator',
        meaning: 'someone who creates winning moments and achievements wherever they focus their energy',
        example: 'She\'s a total victory generator - everything she touches turns to gold.'
      },
      {
        phrase: 'excellence engine',
        meaning: 'a person who consistently produces outstanding results with seemingly effortless skill',
        example: 'That excellence engine just delivered another masterpiece project.'
      },
      {
        phrase: 'momentum master',
        meaning: 'someone who builds and maintains incredible forward progress in any situation',
        example: 'The momentum master has us moving from zero to hero in record time.'
      }
    ],
    'food': [
      {
        phrase: 'flavor architect',
        meaning: 'someone with exceptional taste who creates amazing culinary experiences and combinations',
        example: 'This meal is incredible - you\'re such a flavor architect with these pairings.'
      },
      {
        phrase: 'seasoning specialist',
        meaning: 'a person who perfectly balances flavors and knows exactly what every dish needs',
        example: 'Ask the seasoning specialist - they always know how to fix any recipe.'
      },
      {
        phrase: 'culinary curator',
        meaning: 'someone who expertly selects and presents food that creates memorable dining experiences',
        example: 'Thanks to our culinary curator, this dinner party is absolutely perfect.'
      },
      {
        phrase: 'taste conductor',
        meaning: 'a person who orchestrates flavors and ingredients like a symphony in the kitchen',
        example: 'Watch the taste conductor work - every dish is a harmonious masterpiece.'
      },
      {
        phrase: 'recipe wizard',
        meaning: 'someone with magical abilities to create delicious meals from whatever ingredients available',
        example: 'The recipe wizard just made gourmet dinner from random fridge leftovers.'
      }
    ]
  };

  const fallbacks = vibeSpecificFallbacks[vibe as keyof typeof vibeSpecificFallbacks];
  if (fallbacks) return fallbacks;

  // Default fallbacks for other vibes
  return [
    {
      phrase: 'chaos coordinator',
      meaning: 'someone who thrives in messy situations and somehow makes everything work perfectly',
      example: 'You\'re like a chaos coordinator - turning this disaster into something amazing.'
    },
    {
      phrase: 'vibe calibrator',
      meaning: 'a person who naturally adjusts the energy of any room to match what\'s needed',
      example: 'She\'s the ultimate vibe calibrator - always knows exactly what the moment requires.'
    },
    {
      phrase: 'energy architect',
      meaning: 'someone who designs and builds positive experiences for everyone around them',
      example: 'That energy architect just transformed our boring meeting into something fun.'
    },
    {
      phrase: 'mood wizard',
      meaning: 'a person who has magical abilities to lift spirits and create joy',
      example: 'Our mood wizard always knows exactly what to say to make everyone smile.'
    },
    {
      phrase: 'vibe specialist',
      meaning: 'someone with expert-level skills at reading and improving any social atmosphere',
      example: 'The vibe specialist sensed the tension and immediately fixed it with perfect timing.'
    }
  ];
}

async function moderateCreations(creations: any[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get banned terms from database
  const { data: bannedTerms } = await supabase
    .from('banned_terms')
    .select('phrase');

  const dbBannedWords = bannedTerms?.map(t => t.phrase.toLowerCase()) || [];
  
  // Combine database banned words with our comprehensive blocklist
  const allBannedWords = [...new Set([...CONTENT_BLOCKLIST, ...dbBannedWords])];

  const moderatedCreations = [];

  for (const creation of creations) {
    const textToCheck = `${creation.phrase} ${creation.meaning} ${creation.example}`.toLowerCase();
    
    // 1. Check banned words (exact matches)
    let isSafe = true;
    let violations = [];
    
    const foundBanned = allBannedWords.filter(word => textToCheck.includes(word.toLowerCase()));
    if (foundBanned.length > 0) {
      isSafe = false;
      violations.push(`Contains banned terms: ${foundBanned.join(', ')}`);
      console.log(`Blocked creation for banned words: ${foundBanned.join(', ')}`);
      continue; // Skip this creation
    }

    // 2. Check regex patterns for leetspeak and variations
    let foundPattern = false;
    for (const pattern of CONTENT_BLOCKLIST_REGEX) {
      if (pattern.test(textToCheck)) {
        isSafe = false;
        violations.push('Contains disguised inappropriate content');
        foundPattern = true;
        console.log(`Blocked creation for pattern match: ${pattern}`);
        break;
      }
    }
    
    if (foundPattern) continue;

    // 3. OpenAI Output Moderation API check (using omni-moderation-latest)
    if (openaiApiKey) {
      try {
        const moderationResponse = await withBackoff(async () => {
          const resp = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: `${creation.phrase}: ${creation.meaning}. Example: ${creation.example}`,
              model: 'omni-moderation-latest'
            }),
          });
          
          if (!resp.ok) {
            const e: any = new Error(`OpenAI Moderation ${resp.status}`);
            e.status = resp.status;
            e.response = resp;
            throw e;
          }
          return resp;
        });

        if (moderationResponse.ok) {
          const moderation = await moderationResponse.json();
          const result = moderation.results[0];
          
          if (result.flagged) {
            isSafe = false;
            const flaggedCategories = Object.entries(result.categories)
              .filter(([_, flagged]) => flagged)
              .map(([category, _]) => category);
            violations.push(`AI moderation flagged: ${flaggedCategories.join(', ')}`);
            console.log(`Blocked creation for AI moderation: ${flaggedCategories.join(', ')}`);
            continue; // Skip this creation
          }
        }
      } catch (error) {
        console.error('OpenAI output moderation error:', error);
        // Continue without failing if moderation API is down
      }
    }

    // If we reach here, the creation passed all safety checks

    // Mark as safe and add to results
    moderatedCreations.push({
      ...creation,
      safe_flag: true
    });
  }

  return moderatedCreations;
}

async function saveCreationsToDatabase(userId: string, vibe: string, creations: any[]) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const creationsToInsert = creations.map(creation => ({
      user_id: userId,
      phrase: creation.phrase,
      vibe: vibe,
      meaning: creation.meaning,
      example: creation.example,
      safe_flag: creation.safe_flag,
      creation_type: 'ai'
    }));

    // Use service role key to bypass RLS for server-side operations
    const { error } = await supabase
      .from('creations')
      .insert(creationsToInsert);

    if (error) {
      console.error('Error saving creations:', error);
    } else {
      console.log('Successfully saved creations to database');
    }
  } catch (error) {
    console.error('Database error:', error);
    // Don't throw - we can still return the creations even if saving fails
  }
}

async function updateGenerationLimits(userId: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile to check plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', userId)
      .single();

    const plan = profile?.plan || 'free';
    const today = new Date().toISOString().split('T')[0];
    
    if (plan === 'labpro') {
      // For LabPro users: Update daily limits
      const { data: dailyLimits, error } = await supabase
        .from('limits')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily limits:', error);
        return;
      }

      if (dailyLimits) {
        // Update existing daily limits
        await supabase
          .from('limits')
          .update({
            generations_used: dailyLimits.generations_used + 1
          })
          .eq('id', dailyLimits.id);
      } else {
        // Create new daily limits record
        await supabase
          .from('limits')
          .insert({
            user_id: userId,
            date: today,
            lookups_used: 0,
            generations_used: 1,
            manual_generations_used: 0
          });
      }
    } else {
      // For Free users: Update weekly limits
      const { data: weekStartData } = await supabase
        .rpc('get_week_start')
        .single();
      
      const weekStart = weekStartData;
      
      const { data: limits, error } = await supabase
        .from('limits')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching limits:', error);
        return;
      }

      if (limits) {
        // Update existing limits
        await supabase
          .from('limits')
          .update({
            generations_used: limits.generations_used + 1
          })
          .eq('id', limits.id);
      } else {
        // Create new limits record for the week
        await supabase
          .from('limits')
          .insert({
            user_id: userId,
            date: today,
            week_start_date: weekStart,
            lookups_used: 0,
            generations_used: 1,
            manual_generations_used: 0
          });
      }
    }
  } catch (error) {
    console.error('Error updating generation limits:', error);
  }
}

// Cost calculation function for OpenAI API
function calculateOpenAICost(totalTokens: number, model: string): number {
  const costPer1KTokens = {
    'gpt-5-mini-2025-08-07': 0.000150, // $0.150 per 1K tokens
    'gpt-4o-mini': 0.000150,
    'gpt-4o': 0.005000, // $5.00 per 1K tokens
    'text-moderation-latest': 0.000002 // $0.002 per 1K tokens
  };
  
  const rate = costPer1KTokens[model] || 0.000150; // Default to mini rate
  return (totalTokens / 1000) * rate;
}

// API Usage Logging Function
async function logAPIUsage(logData: {
  api_provider: string;
  api_endpoint: string;
  request_type: string;
  status: number;
  error_message?: string;
  processing_time_ms: number;
  request_data?: any;
  response_data?: any;
  estimated_cost: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user info from context
    const authHeader = globalThis.currentRequest?.headers.get('authorization');
    let userId = null;
    let sessionId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    } else {
      const clientInfo = globalThis.currentRequest?.headers.get('x-client-info');
      sessionId = clientInfo || 'anonymous';
    }

    await supabase.from('api_usage_logs').insert({
      user_id: userId,
      session_id: sessionId,
      api_provider: logData.api_provider,
      api_endpoint: logData.api_endpoint,
      request_type: logData.request_type,
      prompt_tokens: logData.prompt_tokens || 0,
      completion_tokens: logData.completion_tokens || 0,
      total_tokens: logData.total_tokens || 0,
      estimated_cost: logData.estimated_cost,
      request_data: logData.request_data || {},
      response_data: logData.response_data || {},
      function_name: 'generate-slang',
      status: logData.status,
      error_message: logData.error_message,
      processing_time_ms: logData.processing_time_ms
    });

    console.log('API usage logged:', {
      provider: logData.api_provider,
      cost: logData.estimated_cost,
      tokens: logData.total_tokens,
      status: logData.status
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
    // Don't throw - logging failures shouldn't break the main function
  }
}
