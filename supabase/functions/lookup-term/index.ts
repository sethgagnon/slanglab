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

    // Check usage limits
    const authHeader = req.headers.get('authorization');
    const clientInfo = req.headers.get('x-client-info');
    
    if (authHeader) {
      // Authenticated user - check their plan limits
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (user) {
        const usageCheck = await checkUserUsageLimits(supabase, user.id);
        if (usageCheck.error) {
          return new Response(JSON.stringify(usageCheck), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      // Anonymous user - check browser session limits
      const sessionId = clientInfo || 'anonymous';
      const usageCheck = await checkAnonymousUsageLimits(supabase, sessionId);
      if (usageCheck.error) {
        return new Response(JSON.stringify(usageCheck), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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
    } else {
      // Track anonymous usage
      const sessionId = clientInfo || 'anonymous';
      await updateAnonymousUsage(supabase, sessionId);
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

async function getActiveSources() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: sources, error } = await supabase
      .from('search_sources')
      .select('name, base_url, is_required, quality_score')
      .eq('enabled', true)
      .order('quality_score', { ascending: false });

    if (error) {
      console.error('Failed to fetch active sources:', error);
      // Fallback to required sources
      return [
        { name: 'UrbanDictionary', base_url: 'https://www.urbandictionary.com' },
        { name: 'TikTok', base_url: 'https://www.tiktok.com' }
      ];
    }

    // Build final list: all required + highest quality optional (max 5 total)
    const requiredSources = sources.filter(source => source.is_required);
    const optionalSources = sources.filter(source => !source.is_required);
    const finalSources = [...requiredSources];
    const remainingSlots = Math.max(0, 5 - requiredSources.length);
    
    if (remainingSlots > 0) {
      finalSources.push(...optionalSources.slice(0, remainingSlots));
    }

    return finalSources.map(source => ({
      name: source.name,
      base_url: source.base_url
    }));

  } catch (error) {
    console.error('Error getting active sources:', error);
    // Fallback to required sources
    return [
      { name: 'UrbanDictionary', base_url: 'https://www.urbandictionary.com' },
      { name: 'TikTok', base_url: 'https://www.tiktok.com' }
    ];
  }
}

async function fetchAndProcessDefinition(term: string, normalizedTerm: string, supabase: any, existingTermId?: string) {
  // Step 1: Fetch snippets from search API
  const snippets = await fetchSnippets(term);
  console.log('Fetched snippets:', snippets.length);

  // Step 2: Extract definition directly from sources  
  const definition = await extractDefinitionFromSources(term, snippets);
  console.log('Extracted definition from sources:', definition);

  // Step 3: Moderate the definition
  const moderatedDefinition = await moderateDefinition(definition);
  console.log('Moderated definition:', moderatedDefinition);

  // Step 4: Save to database and include sources used
  const activeSources = await getActiveSources();
  const moderatedDefinitionWithSources = {
    ...moderatedDefinition,
    sources_used: activeSources.map(s => s.name)
  };
  
  await saveDefinitionToDatabase(supabase, term, normalizedTerm, moderatedDefinition, snippets, existingTermId);

  return moderatedDefinitionWithSources;
}

async function fetchSnippets(term: string) {
  // Get dynamic sources from get-active-sources function
  const activeSources = await getActiveSources();
  console.log(`Using ${activeSources.length} active sources:`, activeSources.map(s => s.name).join(', '));

  // Try SerpAPI first, then fallback to SEARCH_API_KEY for backward compatibility
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY') || Deno.env.get('SEARCH_API_KEY');
  if (!serpApiKey) {
    console.error('No SerpAPI key found. Please add SERPAPI_API_KEY secret.');
    return [{
      title: 'No Search Results Available',
      url: 'https://example.com',
      snippet: `Unable to fetch real definitions for "${term}" - API key missing`,
      date: new Date().toISOString(),
      publisher: 'System'
    }];
  }

  try {
    // Build search query targeting active sources
    const sourceQueries = activeSources.map(source => `site:${new URL(source.base_url).hostname}`);
    const query = `${term} slang meaning definition (${sourceQueries.join(' OR ')})`;
    const searchUrl = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=10&engine=google`;
    
    console.log('Calling SerpAPI with targeted query:', query);
    
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('SerpAPI response received, organic results count:', data.organic_results?.length || 0);

    // Process SerpAPI search results
    const snippets = data.organic_results?.slice(0, 10).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      date: result.date || new Date().toISOString(),
      publisher: result.displayed_link ? new URL(result.link).hostname : 'Unknown'
    })) || [];

    return snippets;
  } catch (error) {
    console.error('SerpAPI error details:', {
      message: error.message,
      status: error.status,
      term: term,
      hasApiKey: !!serpApiKey
    });
    
    // Return informative error data instead of generic mock
    return [{
      title: 'Search Error',
      url: 'https://example.com',
      snippet: `Unable to fetch real-time definition for "${term}" due to search API error: ${error.message}`,
      date: new Date().toISOString(),
      publisher: 'System Error'
    }];
  }
}

async function extractDefinitionFromSources(term: string, snippets: any[]) {
  console.log('Extracting definition directly from sources');
  
  if (!snippets.length) {
    return {
      meaning: `No definition found for "${term}" in available sources.`,
      tone: 'neutral',
      example: '',
      related: [],
      warning: '',
      citations: [],
      confidence: 'Low'
    };
  }

  // Filter out system error snippets
  const validSnippets = snippets.filter(s => !s.title.includes('Error') && !s.snippet.includes('search API error'));
  
  if (!validSnippets.length) {
    return {
      meaning: `Definition temporarily unavailable for "${term}".`,
      tone: 'neutral',
      example: '',
      related: [],
      warning: 'Search results temporarily unavailable',
      citations: [],
      confidence: 'Low'
    };
  }

  // Extract the best definition from snippets
  let bestDefinition = '';
  let bestExample = '';
  let tone = 'neutral';
  const related: string[] = [];
  
  // Look for Urban Dictionary style definitions first (usually most direct)
  const urbanSnippet = validSnippets.find(s => s.url.includes('urbandictionary.com'));
  if (urbanSnippet) {
    const snippet = urbanSnippet.snippet.toLowerCase();
    
    // Extract definition - look for patterns like "term means" or "term is"
    const definitionPatterns = [
      new RegExp(`${term.toLowerCase()}\\s+(?:means?|is|refers? to)\\s+([^.!?]+)`, 'i'),
      new RegExp(`([^.!?]*${term.toLowerCase()}[^.!?]*)`, 'i')
    ];
    
    for (const pattern of definitionPatterns) {
      const match = urbanSnippet.snippet.match(pattern);
      if (match && match[1]) {
        bestDefinition = match[1].trim();
        break;
      }
    }
    
    // If no pattern match, use first sentence
    if (!bestDefinition) {
      bestDefinition = urbanSnippet.snippet.split('.')[0];
    }
    
    // Extract tone indicators
    if (snippet.includes('positive') || snippet.includes('good') || snippet.includes('cool')) {
      tone = 'positive';
    } else if (snippet.includes('insult') || snippet.includes('negative') || snippet.includes('bad')) {
      tone = 'insulting';
    }
  } else {
    // Use the first valid snippet
    bestDefinition = validSnippets[0].snippet.split('.')[0];
  }

  // Clean up definition
  bestDefinition = bestDefinition
    .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
    
  // Limit to 24 words as per original schema
  const words = bestDefinition.split(' ');
  if (words.length > 24) {
    bestDefinition = words.slice(0, 24).join(' ') + '...';
  }

  // Extract example if available
  for (const snippet of validSnippets) {
    const examplePatterns = [
      /"([^"]*"[^"]*)/g, // Quoted examples
      /example[:\s]+([^.!?]+)/i,
      /like[:\s]+"([^"]+)"/i
    ];
    
    for (const pattern of examplePatterns) {
      const match = snippet.snippet.match(pattern);
      if (match && match[1] && match[1].toLowerCase().includes(term.toLowerCase())) {
        bestExample = match[1].trim();
        break;
      }
    }
    if (bestExample) break;
  }

  // Extract related terms
  for (const snippet of validSnippets) {
    const text = snippet.snippet.toLowerCase();
    const relatedPatterns = [
      /similar to ([^,.!?]+)/i,
      /also (?:called|known as) ([^,.!?]+)/i,
      /like ([^,.!?]+)/i
    ];
    
    for (const pattern of relatedPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && related.length < 4) {
        const relatedTerm = match[1].trim();
        if (relatedTerm !== term.toLowerCase() && !related.includes(relatedTerm)) {
          related.push(relatedTerm);
        }
      }
    }
  }

  // Set confidence based on source quality
  let confidence = 'Low';
  if (validSnippets.length >= 3) {
    confidence = 'High';
  } else if (validSnippets.length >= 2 || urbanSnippet) {
    confidence = 'Medium';
  }

  return {
    meaning: bestDefinition || `A slang term: ${term}`,
    tone,
    example: bestExample || `"${term}" is commonly used in casual conversation.`,
    related,
    warning: '',
    citations: validSnippets.map(s => ({
      title: s.title,
      url: s.url,
      quote: s.snippet,
      date: s.date
    })),
    confidence
  };
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

async function checkUserUsageLimits(supabase: any, userId: string) {
  // Get user profile to check plan and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('user_id', userId)
    .single();

  const plan = profile?.plan || 'Free';
  const role = profile?.role;
  
  // Admin users have unlimited searches
  if (role === 'admin') {
    return { success: true };
  }
  
  // SearchPro and LabPro have unlimited searches
  if (plan === 'SearchPro' || plan === 'LabPro') {
    return { success: true };
  }

  // Free plan: 3 searches per day
  const today = new Date().toISOString().split('T')[0];
  const { data: limits } = await supabase
    .from('limits')
    .select('lookups_used')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const lookupsUsed = limits?.lookups_used || 0;
  const dailyLimit = 3;

  if (lookupsUsed >= dailyLimit) {
    return {
      error: 'Daily search limit reached',
      message: 'You have reached your daily limit of 3 searches. Upgrade to SearchPro for unlimited searches!',
      upgradeRequired: true,
      currentUsage: lookupsUsed,
      limit: dailyLimit
    };
  }

  return { success: true };
}

async function checkAnonymousUsageLimits(supabase: any, sessionId: string) {
  const { data: anonymousSearch } = await supabase
    .from('anonymous_searches')
    .select('search_count')
    .eq('session_id', sessionId)
    .single();

  const searchCount = anonymousSearch?.search_count || 0;
  
  if (searchCount >= 1) {
    return {
      error: 'Free search limit reached',
      message: 'You have used your 1 free search. Please create an account to get 3 daily searches!',
      signUpRequired: true
    };
  }

  return { success: true };
}

async function updateAnonymousUsage(supabase: any, sessionId: string) {
  const { data: existing } = await supabase
    .from('anonymous_searches')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    await supabase
      .from('anonymous_searches')
      .update({ search_count: existing.search_count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('anonymous_searches')
      .insert({
        session_id: sessionId,
        search_count: 1
      });
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
        generations_used: 0,
        creations_used: 0
      });
  }
}