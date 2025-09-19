import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { term } = await req.json();
    console.log('Looking up term:', term);

    if (!term?.trim()) {
      return new Response(JSON.stringify({ error: 'Term is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const normalizedTerm = term.toLowerCase().trim().replace(/\s+/g, '-');

    // Check if term already exists in database
    const { data: existingTerm, error: termError } = await supabase
      .from('terms')
      .select(`
        *,
        senses (
          *,
          sources (*)
        )
      `)
      .eq('normalized_text', normalizedTerm)
      .single();

    if (termError && termError.code !== 'PGRST116') {
      console.error('Database error:', termError);
      throw new Error('Database query failed');
    }

    let definition;

    if (existingTerm && existingTerm.senses?.length > 0) {
      // Term exists, check if it needs updating (older than 24 hours)
      const sense = existingTerm.senses[0];
      const lastChecked = new Date(sense.last_checked_at);
      const now = new Date();
      const hoursSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheck < 24) {
        // Return existing definition
        console.log('Returning cached definition');
        definition = {
          meaning: sense.meaning,
          tone: sense.tone,
          example: sense.example,
          related: sense.related_json || [],
          warning: sense.warning || '',
          confidence: sense.confidence,
          citations: sense.sources?.map(source => ({
            title: source.publisher || 'Source',
            url: source.url,
            quote: source.snippet,
            date: source.published_at
          })) || []
        };
      } else {
        // Re-fetch and update
        console.log('Definition is stale, re-fetching');
        definition = await fetchAndProcessDefinition(term, normalizedTerm, supabase, existingTerm.id);
      }
    } else {
      // New term, fetch definition
      console.log('New term, fetching definition');
      definition = await fetchAndProcessDefinition(term, normalizedTerm, supabase);
    }

    // Log the lookup for authenticated users
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Increment usage limits and log lookup
        await updateUsageLimits(supabase, user.id);
        
        // Find term ID for lookup logging
        const { data: termData } = await supabase
          .from('terms')
          .select('id')
          .eq('normalized_text', normalizedTerm)
          .single();

        if (termData) {
          await supabase
            .from('lookups')
            .insert({
              user_id: user.id,
              term_id: termData.id
            });
        }
      }
    }

    return new Response(JSON.stringify(definition), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in lookup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchAndProcessDefinition(term: string, normalizedTerm: string, supabase: any, existingTermId?: string) {
  // Step 1: Fetch snippets from search API
  const snippets = await fetchSnippets(term);
  console.log('Fetched snippets:', snippets.length);

  // Step 2: Synthesize definition using OpenAI
  const definition = await synthesizeDefinition(term, snippets);
  console.log('Synthesized definition:', definition);

  // Step 3: Moderate the definition
  const moderatedDefinition = await moderateDefinition(definition);
  console.log('Moderated definition:', moderatedDefinition);

  // Step 4: Save to database
  await saveDefinitionToDatabase(supabase, term, normalizedTerm, moderatedDefinition, snippets, existingTermId);

  return moderatedDefinition;
}

async function fetchSnippets(term: string) {
  // Try SerpAPI first, then fallback to SEARCH_API_KEY for backward compatibility
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY') || Deno.env.get('SEARCH_API_KEY');
  if (!serpApiKey) {
    console.log('No search API key, returning mock data');
    return [{
      title: 'Urban Dictionary',
      url: 'https://urbandictionary.com',
      snippet: `Definition for "${term}" from a trusted source`,
      date: new Date().toISOString(),
      publisher: 'Urban Dictionary'
    }];
  }

  try {
    // Using SerpAPI
    const query = `${term} slang meaning definition`;
    const searchUrl = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5&engine=google`;
    
    console.log('Calling SerpAPI with URL:', searchUrl.replace(serpApiKey, '[HIDDEN]'));
    
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('SerpAPI response received, organic results count:', data.organic_results?.length || 0);

    // Process SerpAPI search results
    const snippets = data.organic_results?.slice(0, 5).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      date: result.date || new Date().toISOString(),
      publisher: result.displayed_link ? new URL(result.link).hostname : 'Unknown'
    })) || [];

    return snippets;
  } catch (error) {
    console.error('SerpAPI error:', error);
    // Return mock data as fallback
    return [{
      title: 'Dictionary Source',
      url: 'https://example.com',
      snippet: `Common usage and meaning of "${term}"`,
      date: new Date().toISOString(),
      publisher: 'Dictionary'
    }];
  }
}

async function synthesizeDefinition(term: string, snippets: any[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `You write neutral, family-safe slang definitions with citations.
Use ONLY the provided snippets. No speculation. If sources conflict, note both and set confidence to "Medium".
Output JSON only.

JSON schema:
{
  "meaning": string (<= 24 words, plain English),
  "tone": "positive"|"neutral"|"insulting"|"adult"|"niche",
  "example": string (safe example sentence),
  "related": string[] (0–4 items),
  "warning": string (empty if none),
  "citations": [{"title", "url", "quote", "date"}],
  "confidence": "High"|"Medium"|"Low"
}

SNIPPETS: ${JSON.stringify(snippets)}
TERM: ${term}`;

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
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Return fallback definition
    return {
      meaning: snippets.length > 0 ? `Definition for "${term}" not yet available - please check back later` : 'Not enough reliable sources found yet.',
      tone: 'neutral',
      example: `Example usage of "${term}" coming soon.`,
      related: [],
      warning: 'Limited source data available',
      citations: snippets.map(s => ({
        title: s.title,
        url: s.url,
        quote: s.snippet,
        date: s.date
      })),
      confidence: 'Low'
    };
  }
}

async function moderateDefinition(definition: any) {
  // Check against banned terms
  const bannedTerms = ['harmful-slur', 'harassment-term']; // This would come from database
  
  const textToCheck = `${definition.meaning} ${definition.example}`.toLowerCase();
  
  for (const banned of bannedTerms) {
    if (textToCheck.includes(banned.toLowerCase())) {
      return {
        meaning: "This term isn't appropriate to define here.",
        tone: 'neutral',
        example: '',
        related: [],
        warning: 'Content not available due to safety guidelines',
        citations: [],
        confidence: 'Low'
      };
    }
  }

  return definition;
}

async function saveDefinitionToDatabase(supabase: any, term: string, normalizedTerm: string, definition: any, snippets: any[], existingTermId?: string) {
  try {
    let termId = existingTermId;

    if (!termId) {
      // Create new term
      const { data: newTerm, error: termError } = await supabase
        .from('terms')
        .insert({
          text: term,
          normalized_text: normalizedTerm
        })
        .select()
        .single();

      if (termError) throw termError;
      termId = newTerm.id;
    }

    // Create or update sense
    const { data: sense, error: senseError } = await supabase
      .from('senses')
      .upsert({
        term_id: termId,
        meaning: definition.meaning,
        tone: definition.tone,
        example: definition.example,
        related_json: definition.related || [],
        warning: definition.warning || '',
        confidence: definition.confidence,
        last_checked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (senseError) throw senseError;

    // Delete old sources
    await supabase
      .from('sources')
      .delete()
      .eq('sense_id', sense.id);

    // Insert new sources
    if (definition.citations?.length > 0) {
      const sources = definition.citations.map((citation: any) => ({
        sense_id: sense.id,
        url: citation.url,
        publisher: citation.title,
        snippet: citation.quote,
        published_at: citation.date
      }));

      await supabase
        .from('sources')
        .insert(sources);
    }

    console.log('Successfully saved definition to database');
  } catch (error) {
    console.error('Error saving to database:', error);
    // Don't throw - we can still return the definition even if saving fails
  }
}

async function updateUsageLimits(supabase: any, userId: string) {
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
        lookups_used: limits.lookups_used + 1
      })
      .eq('id', limits.id);
  } else {
    // Create new limits record
    await supabase
      .from('limits')
      .insert({
        user_id: userId,
        date: today,
        lookups_used: 1,
        generations_used: 0
      });
  }
}