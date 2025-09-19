import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      console.log(`[GET-ACTIVE-SOURCES] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[GET-ACTIVE-SOURCES] Fetching active sources');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all enabled sources
    const { data: sources, error } = await supabase
      .from('search_sources')
      .select('name, base_url, is_required, quality_score')
      .eq('enabled', true)
      .order('quality_score', { ascending: false });

    if (error) {
      console.error('[GET-ACTIVE-SOURCES] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sources' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Separate required and non-required sources
    const requiredSources = sources.filter(source => source.is_required);
    const optionalSources = sources.filter(source => !source.is_required);

    // Build final list: all required + highest quality optional (max 5 total)
    const finalSources = [...requiredSources];
    const remainingSlots = Math.max(0, 5 - requiredSources.length);
    
    if (remainingSlots > 0) {
      finalSources.push(...optionalSources.slice(0, remainingSlots));
    }

    // Return only name and base_url for frontend consumption
    const result = finalSources.map(source => ({
      name: source.name,
      base_url: source.base_url
    }));

    console.log(`[GET-ACTIVE-SOURCES] Returning ${result.length} active sources:`, 
      result.map(s => s.name).join(', '));

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[GET-ACTIVE-SOURCES] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});