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
  console.log(`[SYNTHESIS] Starting intelligent analysis for term: ${term}`);
  console.log(`[SYNTHESIS] Total snippets available: ${snippets.length}`);
  
  // Filter and categorize snippets by source reliability
  const validSnippets = snippets.filter(snippet => 
    snippet.snippet && snippet.snippet.length > 20 && 
    !snippet.title?.includes('Error') && 
    !snippet.snippet?.includes('search API error')
  );
  
  console.log(`[SYNTHESIS] Valid snippets after filtering: ${validSnippets.length}`);
  
  if (validSnippets.length === 0) {
    return {
      meaning: `No reliable sources found for "${term}"`,
      tone: 'neutral',
      example: '',
      related: [],
      warning: '',
      citations: [],
      confidence: 'Low'
    };
  }
  
  // Categorize sources by reliability
  const sourceCategories = {
    primary: validSnippets.filter(s => s.url?.includes('urbandictionary.com')),
    secondary: validSnippets.filter(s => s.url?.includes('reddit.com')),
    tertiary: validSnippets.filter(s => s.url?.includes('tiktok.com')),
    other: validSnippets.filter(s => 
      !s.url?.includes('urbandictionary.com') && 
      !s.url?.includes('reddit.com') && 
      !s.url?.includes('tiktok.com')
    )
  };
  
  console.log(`[SYNTHESIS] Source breakdown - Primary: ${sourceCategories.primary.length}, Secondary: ${sourceCategories.secondary.length}, Tertiary: ${sourceCategories.tertiary.length}, Other: ${sourceCategories.other.length}`);
  
  // Extract multiple definitions from different sources
  const extractedDefinitions = [];
  const extractedExamples = [];
  const extractedTones = [];
  
  // Process all sources in priority order
  const allSources = [
    ...sourceCategories.primary,
    ...sourceCategories.secondary, 
    ...sourceCategories.tertiary,
    ...sourceCategories.other
  ];
  
  allSources.forEach((snippet, index) => {
    console.log(`[SYNTHESIS] Processing snippet ${index + 1} from ${snippet.url || 'unknown'}`);
    
    const text = snippet.snippet;
    const isUrbanDict = snippet.url?.includes('urbandictionary.com');
    
    // Extract definitions with multiple patterns
    const definitionPatterns = [
      new RegExp(`${term}[\\s:]+(is|means|refers to|stands for)[\\s:]+([^.!?]+)`, 'i'),
      /(?:meaning|definition)[\s:]*[:\-]?\s*([^.!?]+)/i,
      isUrbanDict ? /^([^.!?]+[.!?])/ : null, // First sentence for UD only
      /([A-Z][^.!?]{20,}[.!?])/, // Well-formed sentences
    ].filter(Boolean);
    
    for (const pattern of definitionPatterns) {
      const match = text.match(pattern);
      if (match) {
        const definition = match[match.length - 1]?.trim();
        if (definition && definition.length > 15 && !definition.toLowerCase().includes('example')) {
          extractedDefinitions.push({
            text: definition,
            source: snippet.url,
            priority: isUrbanDict ? 3 : (snippet.url?.includes('reddit.com') ? 2 : 1),
            confidence: calculateConfidence(definition, text, isUrbanDict)
          });
          console.log(`[SYNTHESIS] Found definition: "${definition.substring(0, 50)}..."`);
          break;
        }
      }
    }
    
    // Extract examples
    const examplePatterns = [
      /(?:example|ex)[\s:]+["\"]?([^""\n.!?]+)/i,
      new RegExp(`[""]([^""]*${term}[^""]*)[""]`, 'i'),
      /\*([^*]*\*)/g, // Urban Dictionary style examples
    ];
    
    for (const pattern of examplePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const example = match[1].trim();
        if (example.length > 5 && example.toLowerCase().includes(term.toLowerCase())) {
          extractedExamples.push({
            text: example,
            source: snippet.url,
            priority: isUrbanDict ? 3 : 1
          });
          console.log(`[SYNTHESIS] Found example: "${example}"`);
          break;
        }
      }
    }
    
    // Analyze tone indicators
    const toneIndicators = {
      positive: ['positive', 'good', 'awesome', 'great', 'cool', 'amazing', 'wonderful'],
      negative: ['negative', 'bad', 'awful', 'terrible', 'offensive', 'inappropriate', 'derogatory'],
      neutral: ['neutral', 'slang', 'term', 'word']
    };
    
    const textLower = text.toLowerCase();
    Object.entries(toneIndicators).forEach(([tone, indicators]) => {
      const matches = indicators.filter(indicator => textLower.includes(indicator)).length;
      if (matches > 0) {
        extractedTones.push({ tone, strength: matches, source: snippet.url });
      }
    });
  });
  
  // Synthesize the best definition from multiple sources
  const synthesizedDefinition = synthesizeDefinition(extractedDefinitions, term);
  const bestExample = selectBestExample(extractedExamples, term);
  const determinedTone = determineTone(extractedTones);
  const confidence = calculateOverallConfidence(extractedDefinitions, validSnippets.length);
  
  console.log(`[SYNTHESIS] Final synthesized definition: ${synthesizedDefinition}`);
  console.log(`[SYNTHESIS] Selected example: ${bestExample}`);
  console.log(`[SYNTHESIS] Determined tone: ${determinedTone}`);
  console.log(`[SYNTHESIS] Overall confidence: ${confidence}`);
  
  // Create comprehensive citations
  const citations = validSnippets.map(snippet => ({
    title: snippet.title || extractTitle(snippet.url) || 'Source',
    url: snippet.url,
    quote: snippet.snippet.substring(0, 200) + (snippet.snippet.length > 200 ? '...' : ''),
    date: new Date().toISOString()
  }));
  
  return {
    meaning: synthesizedDefinition,
    tone: determinedTone,
    example: bestExample,
    related: extractRelatedTerms(allSources, term),
    warning: generateWarning(synthesizedDefinition, determinedTone),
    citations,
    confidence
  };
}

// Helper function to calculate confidence for individual definitions
function calculateConfidence(definition: string, fullText: string, isUrbanDict: boolean): number {
  let score = 0;
  
  // Source reliability
  score += isUrbanDict ? 30 : 10;
  
  // Definition quality indicators
  if (definition.length > 30) score += 20;
  if (definition.includes('is') || definition.includes('means')) score += 15;
  if (!definition.includes('...')) score += 10;
  
  // Context quality
  if (fullText.length > 100) score += 10;
  if (fullText.includes('example')) score += 10;
  
  return Math.min(score, 100);
}

// Synthesize the best definition from multiple sources
function synthesizeDefinition(definitions: any[], term: string): string {
  if (definitions.length === 0) {
    return `Unable to determine meaning for "${term}"`;
  }
  
  // Sort by priority and confidence
  const sortedDefs = definitions.sort((a, b) => 
    (b.priority * 50 + b.confidence) - (a.priority * 50 + a.confidence)
  );
  
  // If we have a high-confidence Urban Dictionary definition, use it
  const topDef = sortedDefs[0];
  if (topDef.priority >= 3 && topDef.confidence > 70) {
    return cleanDefinition(topDef.text);
  }
  
  // Otherwise, try to combine multiple definitions for consensus
  const commonPhrases = findCommonPhrases(sortedDefs.slice(0, 3));
  if (commonPhrases.length > 0) {
    return cleanDefinition(commonPhrases[0]);
  }
  
  // Fallback to best available definition
  return cleanDefinition(topDef.text);
}

// Find common phrases across definitions
function findCommonPhrases(definitions: any[]): string[] {
  if (definitions.length < 2) return [];
  
  const phrases = [];
  const texts = definitions.map(d => d.text.toLowerCase());
  
  // Look for common multi-word phrases
  for (let i = 0; i < texts.length; i++) {
    const words = texts[i].split(/\s+/);
    for (let j = 0; j < words.length - 1; j++) {
      const phrase = words.slice(j, j + 3).join(' ');
      if (phrase.length > 10) {
        const occurrences = texts.filter(t => t.includes(phrase)).length;
        if (occurrences > 1) {
          phrases.push(definitions[i].text);
          break;
        }
      }
    }
  }
  
  return phrases;
}

// Select the best example from available options
function selectBestExample(examples: any[], term: string): string {
  if (examples.length === 0) return '';
  
  // Sort by priority and relevance
  const sorted = examples.sort((a, b) => {
    const aScore = a.priority * 10 + (a.text.toLowerCase().includes(term.toLowerCase()) ? 5 : 0);
    const bScore = b.priority * 10 + (b.text.toLowerCase().includes(term.toLowerCase()) ? 5 : 0);
    return bScore - aScore;
  });
  
  return cleanExample(sorted[0].text, term);
}

// Determine overall tone from multiple indicators
function determineTone(toneIndicators: any[]): string {
  if (toneIndicators.length === 0) return 'neutral';
  
  const toneScores = { positive: 0, negative: 0, neutral: 0 };
  
  toneIndicators.forEach(indicator => {
    toneScores[indicator.tone] += indicator.strength;
  });
  
  const maxScore = Math.max(...Object.values(toneScores));
  return Object.keys(toneScores).find(tone => toneScores[tone] === maxScore) || 'neutral';
}

// Calculate overall confidence based on source consensus
function calculateOverallConfidence(definitions: any[], totalSources: number): string {
  if (definitions.length === 0) return 'Low';
  
  const avgConfidence = definitions.reduce((sum, def) => sum + def.confidence, 0) / definitions.length;
  const consensusRatio = definitions.length / totalSources;
  
  if (avgConfidence > 70 && consensusRatio > 0.5) return 'High';
  if (avgConfidence > 50 && consensusRatio > 0.3) return 'Medium';
  return 'Low';
}

// Extract related terms from sources
function extractRelatedTerms(sources: any[], term: string): string[] {
  const related = new Set<string>();
  
  sources.forEach(source => {
    const text = source.snippet.toLowerCase();
    
    // Look for "also known as", "similar to", etc.
    const patterns = [
      /(?:also known as|aka|similar to|related to)[\s:]+([^,.!?]+)/gi,
      /(?:see also|related)[\s:]+([^,.!?]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const terms = match[1].split(/[,&]/).map(t => t.trim()).filter(t => t.length > 2 && t !== term.toLowerCase());
          terms.forEach(t => related.add(t));
        }
      }
    });
  });
  
  return Array.from(related).slice(0, 5);
}

// Generate appropriate warnings
function generateWarning(definition: string, tone: string): string {
  const defLower = definition.toLowerCase();
  
  if (tone === 'negative' || defLower.includes('offensive') || defLower.includes('inappropriate')) {
    return 'This term may contain offensive or inappropriate content.';
  }
  
  if (defLower.includes('sexual') || defLower.includes('explicit')) {
    return 'This term may contain adult or explicit content.';
  }
  
  return '';
}

// Clean and format definition text
function cleanDefinition(text: string): string {
  return text
    .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/\.$/, '') // Remove trailing period
    .substring(0, 200); // Limit length
}

// Clean and format example text
function cleanExample(text: string, term: string): string {
  let cleaned = text
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/\s+/g, ' ')
    .trim();
  
  // If example doesn't contain the term, create one
  if (!cleaned.toLowerCase().includes(term.toLowerCase())) {
    cleaned = `"${term}!"`;
  }
  
  return cleaned.substring(0, 100);
}

// Extract title from URL
function extractTitle(url: string): string {
  if (!url) return 'Unknown Source';
  
  if (url.includes('urbandictionary.com')) return 'Urban Dictionary';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('tiktok.com')) return 'TikTok';
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Web Source';
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