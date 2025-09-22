import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackerConfig {
  id: string;
  term_id: string;
  sensitivity: string;
  sources_enabled: string[];
  per_run_cap?: number;
}

interface SourceRule {
  source_name: string;
  enabled: boolean;
  per_run_cap: number;
  domains_allowlist: string[];
  domains_blocklist: string[];
  min_score: number;
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
  published_at?: string;
  match_type: string;
  score: number;
}

interface Sighting {
  term_id: string;
  url: string;
  title?: string;
  snippet: string;
  source: string;
  match_type: string;
  score: number;
  first_seen_at: string;
  last_seen_at: string;
}

// Query expansion utilities
function generateQueryPack(term: string): string[] {
  const queries: string[] = [];
  const baseTerm = term.toLowerCase().trim();
  
  // Base term
  queries.push(`"${baseTerm}"`);
  
  // Hashtag variant
  queries.push(`"#${baseTerm.replace(/\s+/g, '')}"`);
  
  // Hyphen/space variants
  if (baseTerm.includes(' ')) {
    queries.push(`"${baseTerm.replace(/\s+/g, '-')}"`);
  }
  if (baseTerm.includes('-')) {
    queries.push(`"${baseTerm.replace(/-/g, ' ')}"`);
  }
  
  // Common inflections
  const inflections = ['s', 'ed', 'ing', 'y'];
  inflections.forEach(suffix => {
    queries.push(`"${baseTerm}${suffix}"`);
  });
  
  // Context phrases for precision
  queries.push(`"${baseTerm}" AND ("slang" OR "means" OR "as in")`);
  
  return queries;
}

// Scoring algorithm
function calculateScore(result: SearchResult, term: string): number {
  let score = 0;
  const termLower = term.toLowerCase();
  const titleLower = result.title?.toLowerCase() || '';
  const snippetLower = result.snippet.toLowerCase();
  const content = `${titleLower} ${snippetLower}`;
  
  // Match quality scoring
  if (content.includes(`"${termLower}"`)) {
    score += 50; // Exact match
  } else if (content.includes(`#${termLower.replace(/\s+/g, '')}`)) {
    score += 40; // Hashtag match
  } else if (content.includes(termLower)) {
    score += 30; // Near-exact match
  } else {
    // Check for fuzzy match (≤1 edit distance)
    const words = termLower.split(' ');
    const hasCloseMatch = words.some(word => {
      const regex = new RegExp(word.replace(/./g, '.$?'), 'i');
      return regex.test(content);
    });
    if (hasCloseMatch) score += 15;
  }
  
  // Context bonus
  if (content.match(/\b(slang|means|as in|definition|refers to)\b/i)) {
    score += 10;
  }
  
  // Source quality
  if (result.source.match(/\b(news|blog|article)\b/i)) {
    score += 10;
  } else if (result.source.match(/\b(forum|reddit|discussion)\b/i)) {
    score += 5;
  }
  
  // Freshness bonus
  if (result.published_at) {
    const publishedDate = new Date(result.published_at);
    const daysSince = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 7) {
      score += 10;
    } else if (daysSince <= 30) {
      score += 5;
    }
  }
  
  // Penalties
  if (content.match(/\b(dictionary|definition|brand|company|trademark)\b/i)) {
    score -= 25; // Dictionary/brand collision
  }
  
  return Math.max(0, Math.min(100, score));
}

// Google Custom Search integration
async function searchGoogleCSE(queries: string[], allowlist: string[], maxResults: number): Promise<SearchResult[]> {
  const apiKey = Deno.env.get('GOOGLE_CSE_API_KEY');
  const cseId = Deno.env.get('GOOGLE_CSE_ID');
  
  if (!apiKey || !cseId) {
    console.log('Google CSE credentials not available');
    return [];
  }
  
  const results: SearchResult[] = [];
  const perQueryLimit = Math.ceil(maxResults / queries.length);
  
  for (const query of queries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
    try {
      let url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=${Math.min(perQueryLimit, 10)}`;
      
      // Apply site allowlist if provided
      if (allowlist.length > 0) {
        const siteRestrictions = allowlist.map(domain => `site:${domain}`).join(' OR ');
        url += `&siteSearch=${encodeURIComponent(siteRestrictions)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`Google CSE error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.items) {
        for (const item of data.items) {
          results.push({
            url: item.link,
            title: item.title || '',
            snippet: item.snippet || '',
            source: 'google_cse',
            match_type: 'web_search',
            score: 0 // Will be calculated later
          });
        }
      }
    } catch (error) {
      console.error(`Google CSE search error for query "${query}":`, error);
    }
  }
  
  return results;
}

// NewsAPI integration
async function searchNewsAPI(term: string, allowlist: string[], maxResults: number): Promise<SearchResult[]> {
  const apiKey = Deno.env.get('NEWS_API_KEY');
  
  if (!apiKey) {
    console.log('NewsAPI credentials not available');
    return [];
  }
  
  try {
    let url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(term)}&sortBy=publishedAt&pageSize=${Math.min(maxResults, 100)}&apiKey=${apiKey}`;
    
    // Apply domains filter if allowlist provided
    if (allowlist.length > 0) {
      url += `&domains=${allowlist.join(',')}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`NewsAPI error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    if (data.articles) {
      for (const article of data.articles) {
        if (article.url && article.description) {
          results.push({
            url: article.url,
            title: article.title || '',
            snippet: article.description,
            source: 'news_api',
            published_at: article.publishedAt,
            match_type: 'news_search',
            score: 0 // Will be calculated later
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('NewsAPI search error:', error);
    return [];
  }
}

// Normalize and deduplicate results
function normalizeAndDedupe(results: SearchResult[], term: string): SearchResult[] {
  const urlMap = new Map<string, SearchResult>();
  
  for (const result of results) {
    // Normalize URL (remove fragments, normalize domains)
    const normalizedUrl = result.url.split('#')[0].toLowerCase();
    
    // Calculate score
    result.score = calculateScore(result, term);
    
    // Handle duplicates - keep highest scoring
    if (urlMap.has(normalizedUrl)) {
      const existing = urlMap.get(normalizedUrl)!;
      if (result.score > existing.score) {
        urlMap.set(normalizedUrl, result);
      } else {
        // Apply duplicate penalty to lower scoring result
        result.score = Math.max(0, result.score - 100);
      }
    } else {
      urlMap.set(normalizedUrl, result);
    }
  }
  
  return Array.from(urlMap.values())
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { term_id } = await req.json();
    
    if (!term_id) {
      return new Response(
        JSON.stringify({ error: 'term_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Running tracker for term_id: ${term_id}`);

    // Get tracker configuration
    const { data: trackerData, error: trackerError } = await supabaseClient
      .from('trackers')
      .select('*')
      .eq('term_id', term_id)
      .single();

    if (trackerError || !trackerData) {
      console.error('Tracker not found:', trackerError);
      return new Response(
        JSON.stringify({ error: 'Tracker not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get term data
    const { data: termData, error: termError } = await supabaseClient
      .from('terms')
      .select('text')
      .eq('id', term_id)
      .single();

    if (termError || !termData) {
      console.error('Term not found:', termError);
      return new Response(
        JSON.stringify({ error: 'Term not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get source rules for enabled sources
    const { data: sourceRules, error: sourceError } = await supabaseClient
      .from('source_rules')
      .select('*')
      .eq('enabled', true)
      .in('source_name', trackerData.sources_enabled || []);

    if (sourceError) {
      console.error('Error fetching source rules:', sourceError);
    }

    const rules = sourceRules || [];
    const term = termData.text;
    const defaultCap = 25;

    console.log(`Searching for term: "${term}" with ${rules.length} enabled sources`);

    // Generate query pack
    const queries = generateQueryPack(term);
    console.log(`Generated ${queries.length} query variants`);

    // Collect results from all sources
    let allResults: SearchResult[] = [];

    // Google CSE search
    for (const rule of rules.filter(r => r.source_name === 'google_cse')) {
      const cap = rule.per_run_cap || defaultCap;
      const allowlist = rule.domains_allowlist || [];
      
      console.log(`Searching Google CSE with cap: ${cap}, allowlist: ${allowlist.length} domains`);
      const results = await searchGoogleCSE(queries, allowlist, cap);
      allResults = allResults.concat(results);
    }

    // NewsAPI search
    for (const rule of rules.filter(r => r.source_name === 'news_api')) {
      const cap = rule.per_run_cap || defaultCap;
      const allowlist = rule.domains_allowlist || [];
      
      console.log(`Searching NewsAPI with cap: ${cap}, allowlist: ${allowlist.length} domains`);
      const results = await searchNewsAPI(term, allowlist, cap);
      allResults = allResults.concat(results);
    }

    console.log(`Found ${allResults.length} raw results`);

    // Normalize, score, and deduplicate
    const processedResults = normalizeAndDedupe(allResults, term);
    console.log(`Processed to ${processedResults.length} unique results`);

    // Filter by minimum score
    const minScore = rules.length > 0 ? Math.min(...rules.map(r => r.min_score || 0)) : 0;
    const qualifiedResults = processedResults.filter(r => r.score >= minScore);
    console.log(`${qualifiedResults.length} results meet minimum score threshold of ${minScore}`);

    // Upsert sightings
    const now = new Date().toISOString();
    const sightings: Sighting[] = qualifiedResults.map(result => ({
      term_id,
      url: result.url,
      title: result.title,
      snippet: result.snippet,
      source: result.source,
      match_type: result.match_type,
      score: result.score,
      first_seen_at: now,
      last_seen_at: now
    }));

    if (sightings.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('sightings')
        .upsert(sightings, {
          onConflict: 'term_id,url',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting sightings:', upsertError);
      } else {
        console.log(`Upserted ${sightings.length} sightings`);
      }
    }

    // Update tracker last_run_at
    const { error: updateError } = await supabaseClient
      .from('trackers')
      .update({ last_run_at: now })
      .eq('term_id', term_id);

    if (updateError) {
      console.error('Error updating tracker:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        term_id,
        queries_generated: queries.length,
        results_found: allResults.length,
        results_processed: processedResults.length,
        sightings_created: sightings.length,
        min_score: minScore
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in run_tracker function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
