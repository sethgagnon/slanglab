import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase 1: Safety Backbone + Age Controls - Enhanced Content Policy
type AgeBand = '11-13' | '14-17' | '18-22';

interface AgePolicy {
  ageBand: AgeBand;
  requireSchoolSafe: boolean;
  maxCreativity: number;
  allowedFormats: string[];
  allowedContexts: string[];
  canShare: boolean;
}

// Enhanced content blocklist with leetspeak and age-specific filtering
const CONTENT_BLOCKLIST = [
  // Profanity and slurs
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss',
  'fck', 'sh*t', 'b*tch', 'd*mn', 'h*ll', '@ss', 'fuk', 'shyt',
  
  // Sexual content
  'sex', 'sexy', 'hot', 'horny', 'porn', 'nude', 'naked', 'boobs', 'dick',
  's3x', 's3xy', 'h0t', 'p0rn', 'n00ds', 'b00bs', 'd1ck',
  
  // Drugs and alcohol  
  'drunk', 'wasted', 'high', 'stoned', 'blazed', 'lit', 'turnt',
  'beer', 'wine', 'vodka', 'weed', 'pot', 'marijuana', 'joints', 'bong',
  'd*nk', 'w33d', 'p0t', 'w33d', 'j01nts',
  
  // Violence and weapons
  'kill', 'murder', 'gun', 'knife', 'weapon', 'shoot', 'stab', 'blood',
  'k*ll', 'murd3r', 'sh00t', 'st@b', 'bl00d',
  
  // Self-harm and mental health
  'suicide', 'depression', 'cutting', 'harm', 'hurt', 'death', 'die',
  'su*c*de', 'd3pr3ss10n', 'cu77ing', 'd3@th',
  
  // Hate speech and discrimination
  'hate', 'racist', 'nazi', 'terrorist', 'stupid', 'idiot', 'retard',
  'h@te', 'rac*st', 'n@zi', 'stup1d', 'id10t', 'r3t@rd'
];

// Regex patterns for leetspeak and variations
const CONTENT_BLOCKLIST_REGEX = [
  /[s5][h3][i1][t7]/gi,           // shit variations
  /[f][u][c][k]/gi,               // fuck variations  
  /[b][i1][t7][c][h]/gi,          // bitch variations
  /[a@][s5]{2,}/gi,               // ass variations
  /[d][a@][m][n]/gi,              // damn variations
  /[s5][e3][x]/gi,                // sex variations
  /[p][o0][r][n]/gi,              // porn variations
  /[w][e3]{2}[d]/gi,              // weed variations
  /[k][i1][l]{2}/gi,              // kill variations
  /[s5][h][o0]{2}[t7]/gi,         // shoot variations
  /[0-9@$!#%^&*]{3,}/g           // Excessive special chars/numbers
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

// Age-aware vibe prompts with enhanced safety
const VIBES = {
  'praise': 'Create innovative compliment slang phrases that are positive and uplifting. Focus on celebrating achievements, talents, and positive qualities. Use creative wordplay and fresh combinations. Keep language family-friendly and school-appropriate.',
  'hype': 'Generate high-energy excitement phrases that capture enthusiasm and celebration. Think achievements, accomplishments, and positive moments. Use creative compounds and energetic language while maintaining appropriateness.',
  'food': 'Create food-inspired slang phrases that blend culinary culture with modern language. Focus on cooking, flavors, and food experiences. Use appetizing metaphors and food culture references in a fun, clean way.',
  'compliment': 'Generate fresh compliment phrases that sound genuine and positive. Focus on personality traits, talents, and positive characteristics. Use uplifting metaphors and encouraging language.',
  'gentle-roast': 'Create witty but affectionate teasing phrases that show friendship through gentle humor. Think harmless, endearing observations about quirks and habits. Keep it loving and fun without any mean-spirited content.',
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
    
    '18-22': schoolSafe ? `
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
    const response = await fetch('https://api.openai.com/v1/moderations', {
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

  try {
    // Enhanced input validation with age-aware parameters
    const body = await req.json();
    const { 
      vibe, 
      ageBand: clientAgeBand, 
      schoolSafe: clientSchoolSafe, 
      creativity: clientCreativity,
      format: clientFormat,
      context: clientContext 
    } = body;
    
    if (!vibe || typeof vibe !== 'string' || !VIBES[vibe as keyof typeof VIBES]) {
      return new Response(JSON.stringify({ error: 'Invalid vibe specified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input moderation check
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

    console.log('Generating slang for vibe:', vibe);

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
          canShare: false
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
      format: serverAgePolicy.allowedFormats.includes(clientFormat ?? 'word') ? 
        clientFormat : serverAgePolicy.allowedFormats[0],
      context: serverAgePolicy.allowedContexts.includes(clientContext ?? 'generic') ? 
        clientContext : 'generic'
    };

    console.log('Enforced parameters:', enforcedParams);

    // Smart cache strategy check
    const { shouldUseCache, cacheEntry } = await checkCacheStrategy(userId, vibe, userPlan, userRole);
    
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
    const result = await generateSlang(vibe, enforcedParams);
    console.log('Generated result:', result);

    // Moderate the generated content
    const moderatedCreations = await moderateCreations(result.creations);
    console.log('Moderated creations:', moderatedCreations);

    // Save to cache if we got AI content
    if (result.isFromAI && moderatedCreations.length > 0) {
      await saveToCacheDatabase(vibe, moderatedCreations);
    }

    // Save to database if user is authenticated
    if (userId) {
      await saveCreationsToDatabase(userId, vibe, moderatedCreations);
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
  vibe: string, 
  params: {
    ageBand: AgeBand;
    creativity: number;
    schoolSafe: boolean;
    format?: string;
    context?: string;
  },
  retryCount = 0
): Promise<{ creations: any[], isFromAI: boolean, error?: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured');
    // Try cache fallback first
    const fallbackFromCache = await getFallbackFromCache(vibe);
    if (fallbackFromCache) {
      return { creations: fallbackFromCache, isFromAI: false, error: 'OpenAI API key not configured - using cached content' };
    }
    return { 
      creations: getFallbackCreations(vibe), 
      isFromAI: false,
      error: 'OpenAI API key not configured' 
    };
  }

  const vibePrompt = VIBES[vibe as keyof typeof VIBES];
  const ageSafetyPrompt = getAgeSafetyPrompt(params.ageBand, params.schoolSafe);
  
  const systemPrompt = `${vibePrompt}

${ageSafetyPrompt}

Creative Instructions:
- Use wordplay, puns, alliteration, and sound patterns appropriate for age group
- Create compound words and fresh metaphors
- Use sensory language and vivid imagery
- Make each phrase feel distinct and memorable
- Creativity level: ${params.creativity} (0.1 = very conservative, 1.0 = very creative)

Return 1-3 high-quality slang items in the specified JSON format. Quality over quantity.`;

  try {
    const apiCallStart = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Generate ${params.ageBand} age-appropriate slang for "${vibe}" vibe. School-safe: ${params.schoolSafe}. Return JSON only.`
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
    const apiCallEnd = Date.now();

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Log failed API call
      await logAPIUsage({
        api_provider: 'openai',
        api_endpoint: 'chat/completions',
        request_type: 'generation',
        status: response.status,
        error_message: `OpenAI API error: ${response.status} - ${errorText}`,
        processing_time_ms: apiCallEnd - apiCallStart,
        request_data: { model: 'gpt-5-mini-2025-08-07', vibe, ageBand: params.ageBand },
        estimated_cost: 0.01
      });
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/3)`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return generateSlang(vibe, params, retryCount + 1);
      }
      
      // Enhanced fallback - try cache first, then predefined
      const fallbackFromCache = await getFallbackFromCache(vibe);
      if (fallbackFromCache) {
        console.log('Using cache fallback');
        return { creations: fallbackFromCache, isFromAI: false, error: 'OpenAI API error - using cached content' };
      }
      
      console.log('Using predefined fallback');
      const errorMsg = response.status === 429 
        ? 'OpenAI rate limit exceeded. Using creative fallback content.' 
        : `OpenAI API error: ${response.status}`;
        
      return { 
        creations: getFallbackCreations(vibe), 
        isFromAI: false,
        error: errorMsg
      };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Log successful API call
    await logAPIUsage({
      api_provider: 'openai',
      api_endpoint: 'chat/completions',
      request_type: 'generation', 
      status: response.status,
      processing_time_ms: apiCallEnd - apiCallStart,
      request_data: { model: 'gpt-5-mini-2025-08-07', vibe, ageBand: params.ageBand },
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
      
      // Validate each item has required fields
      const validCreations = slangItems.filter(item => 
        item.phrase && item.meaning && item.example &&
        typeof item.phrase === 'string' && 
        typeof item.meaning === 'string' && 
        typeof item.example === 'string'
      );
      
      if (validCreations.length === 0) {
        throw new Error('No valid creations in response');
      }
      
      console.log(`Successfully generated ${validCreations.length} fresh AI content items`);
      return { creations: validCreations, isFromAI: true };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      
      // Try cache fallback before predefined
      const fallbackFromCache = await getFallbackFromCache(vibe);
      if (fallbackFromCache) {
        return { creations: fallbackFromCache, isFromAI: false, error: 'Invalid AI response - using cached content' };
      }
      
      return { 
        creations: getFallbackCreations(vibe), 
        isFromAI: false,
        error: 'Invalid AI response format'
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Enhanced fallback - try cache first, then predefined
    const fallbackFromCache = await getFallbackFromCache(vibe);
    if (fallbackFromCache) {
      console.log('Using cache fallback due to error');
      return { creations: fallbackFromCache, isFromAI: false, error: 'API error - using cached content' };
    }
    
    console.log('Using predefined fallback due to error');
    return { 
      creations: getFallbackCreations(vibe), 
      isFromAI: false,
      error: error.message || 'Unknown API error'
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
        const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
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
