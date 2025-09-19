import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIBES = {
  'praise': 'Create 5 innovative compliment slang phrases that Gen Z would actually use. Think viral TikTok energy, creative wordplay, and internet culture mashups. Use sound symbolism, puns, and fresh combinations. Examples: "chef\'s kiss energy", "main character moment". Make them feel authentic and shareable.',
  'hype': 'Generate 5 high-energy hype phrases that capture internet excitement culture. Think gaming victories, concert energy, and viral moment vibes. Use creative compounds, onomatopoeia, and pop culture references. Examples: "elite mode activated", "legendary status unlocked". Make them explosive and memorable.',
  'food': 'Create 5 food-inspired slang phrases that blend culinary culture with modern internet language. Think foodie influencer meets Gen Z creativity. Use cooking metaphors, flavor descriptions, and restaurant culture. Examples: "seasoned to perfection", "chef mode activated". Make them deliciously creative.',
  'compliment': 'Generate 5 next-level compliment phrases that sound fresh and genuine. Blend aesthetic trends, personality archetypes, and positive psychology. Use creative metaphors and contemporary references. Examples: "cottagecore queen", "golden retriever energy". Make them feel personal and uplifting.',
  'gentle-roast': 'Create 5 witty but affectionate teasing phrases that show love through playful shade. Think best friend banter and sibling energy. Use clever wordplay and harmless absurdity. Examples: "lovable chaos gremlin", "certified overthinker". Keep them endearing and fun.',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vibe } = await req.json();
    console.log('Generating slang for vibe:', vibe);

    if (!vibe || !VIBES[vibe as keyof typeof VIBES]) {
      return new Response(JSON.stringify({ error: 'Invalid vibe specified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('authorization');
    let userId = null;

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
        
        // Check usage limits - weekly for free users
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, role')
          .eq('user_id', userId)
          .single();

        const plan = profile?.plan || 'free';
        const role = profile?.role;
        
        // Admin users have unlimited generations
        if (role === 'admin') {
          // Skip all limits for admin users
        } else if (plan === 'labpro') {
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
      }
    }

    // Generate slang using OpenAI
    const result = await generateSlang(vibe);
    console.log('Generated result:', result);

    // Moderate the generated content
    const moderatedCreations = await moderateCreations(result.creations);
    console.log('Moderated creations:', moderatedCreations);

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

async function generateSlang(vibe: string, retryCount = 0): Promise<{ creations: any[], isFromAI: boolean, error?: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured');
    return { 
      creations: getFallbackCreations(vibe), 
      isFromAI: false,
      error: 'OpenAI API key not configured' 
    };
  }

  const vibePrompt = VIBES[vibe as keyof typeof VIBES];
  
  const prompt = `${vibePrompt}

Return a JSON array with exactly 5 items. Each item should have:
{ "phrase": string (1-3 words), "meaning": string (15-20 words maximum), "example": string (natural conversational sentence) }

Creative Instructions:
- Use wordplay, puns, alliteration, and sound patterns
- Blend different linguistic styles (formal meets slang, tech meets poetry)
- Reference internet culture, aesthetics, and contemporary vibes WITHOUT claiming they're trending
- Create compound words and fresh metaphors
- Mix different formality levels for variety
- Use sensory language and vivid imagery
- Make each phrase feel distinct and memorable

Safety Rules:
- No profanity, slurs, sexual content, harassment, or targeted insults
- Keep examples conversational and natural
- Family-friendly but not childish
- Avoid stereotypes or cultural appropriation

Return only the JSON array, no other text.`;

  try {
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
            content: prompt
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/3)`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return generateSlang(vibe, retryCount + 1);
      }
      
      // Return fallback with specific error info
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
    
    try {
      const creations = JSON.parse(content);
      if (!Array.isArray(creations) || creations.length !== 5) {
        throw new Error('Invalid response format');
      }
      console.log('Successfully generated fresh AI content');
      return { creations, isFromAI: true };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return { 
        creations: getFallbackCreations(vibe), 
        isFromAI: false,
        error: 'Invalid AI response format'
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return { 
      creations: getFallbackCreations(vibe), 
      isFromAI: false,
      error: error.message || 'Unknown API error'
    };
  }
}

function getFallbackCreations(vibe: string) {
  // Return vibe-specific fallbacks where possible
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
    ]
  };

  return vibeSpecificFallbacks[vibe as keyof typeof vibeSpecificFallbacks] || [
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
  const bannedWords = [
    'hate', 'slur', 'inappropriate', 'offensive', 'harmful',
    // Add more banned words as needed
  ];

  return creations.map(creation => {
    const textToCheck = `${creation.phrase} ${creation.meaning} ${creation.example}`.toLowerCase();
    
    let isSafe = true;
    for (const banned of bannedWords) {
      if (textToCheck.includes(banned)) {
        isSafe = false;
        break;
      }
    }

    return {
      ...creation,
      safe_flag: isSafe
    };
  }).filter(creation => creation.safe_flag); // Only return safe creations
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