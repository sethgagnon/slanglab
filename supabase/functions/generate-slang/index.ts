import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIBES = {
  'praise': 'Generate 5 playful phrases for praising someone or showing appreciation. Each should be 1-2 words max.',
  'hype': 'Generate 5 energetic phrases for showing excitement or hype. Each should be 1-2 words max.',
  'food': 'Generate 5 fun phrases related to food, dining, or delicious things. Each should be 1-2 words max.',
  'compliment': 'Generate 5 gentle compliment phrases that make someone feel good. Each should be 1-2 words max.',
  'gentle-roast': 'Generate 5 very mild, playful teasing phrases that are friendly and harmless. Each should be 1-2 words max.',
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
        
        // Check usage limits
        const today = new Date().toISOString().split('T')[0];
        const { data: limits } = await supabase
          .from('limits')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', userId)
          .single();

        const plan = profile?.plan || 'free';
        const generationsUsed = limits?.generations_used || 0;
        const maxGenerations = plan === 'free' ? 3 : -1; // -1 for unlimited

        if (plan === 'free' && generationsUsed >= maxGenerations) {
          return new Response(JSON.stringify({ 
            error: 'Generation limit reached for today. Upgrade to Plus for unlimited generations.' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Generate slang using OpenAI
    const creations = await generateSlang(vibe);
    console.log('Generated creations:', creations);

    // Moderate the generated content
    const moderatedCreations = await moderateCreations(creations);
    console.log('Moderated creations:', moderatedCreations);

    // Save to database if user is authenticated
    if (userId) {
      await saveCreationsToDatabase(userId, vibe, moderatedCreations);
      await updateGenerationLimits(userId);
    }

    return new Response(JSON.stringify({ creations: moderatedCreations }), {
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

async function generateSlang(vibe: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const vibePrompt = VIBES[vibe as keyof typeof VIBES];
  
  const prompt = `${vibePrompt}

Return a JSON array with exactly 5 items. Each item should have:
{ "phrase": string (max 2 words), "meaning": string (max 12 words), "example": string (safe sentence) }

Rules:
- No profanity, slurs, sexual content, harassment, or targeted insults
- Do NOT claim phrases are trending or popular
- Make them creative but family-friendly
- Examples should be safe for all audiences

Return only the JSON array, no other text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const creations = JSON.parse(content);
      if (!Array.isArray(creations) || creations.length !== 5) {
        throw new Error('Invalid response format');
      }
      return creations;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Return fallback creations
    return [
      {
        phrase: 'mood boost',
        meaning: 'something that instantly improves your day',
        example: 'That compliment was a real mood boost.'
      },
      {
        phrase: 'golden era',
        meaning: 'peak performance or excellence',
        example: 'You\'re in your golden era right now.'
      },
      {
        phrase: 'energy drink',
        meaning: 'person who brings positive vibes',
        example: 'You\'re like a human energy drink today.'
      },
      {
        phrase: 'chef\'s choice',
        meaning: 'something perfectly selected',
        example: 'Your outfit today is chef\'s choice!'
      },
      {
        phrase: 'smooth operator',
        meaning: 'someone handling things effortlessly',
        example: 'Look at you being a smooth operator.'
      }
    ];
  }
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
      safe_flag: creation.safe_flag
    }));

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

    const today = new Date().toISOString().split('T')[0];
    
    const { data: limits, error } = await supabase
      .from('limits')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

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
      // Create new limits record
      await supabase
        .from('limits')
        .insert({
          user_id: userId,
          date: today,
          lookups_used: 0,
          generations_used: 1
        });
    }
  } catch (error) {
    console.error('Error updating generation limits:', error);
  }
}