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
    const { filters = {}, page = 1, limit = 20 } = await req.json();
    console.log('Loading user history with filters:', filters);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query for lookups
    let lookupsQuery = supabase
      .from('lookups')
      .select(`
        id,
        created_at,
        terms (
          id,
          text,
          normalized_text,
          senses (
            meaning,
            tone,
            confidence
          )
        ),
        favorites!inner (
          user_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.search) {
      // This is a simplified search - in production you'd want to use full-text search
      lookupsQuery = lookupsQuery.ilike('terms.text', `%${filters.search}%`);
    }

    if (filters.tone && filters.tone !== 'all') {
      lookupsQuery = lookupsQuery.eq('terms.senses.tone', filters.tone);
    }

    if (filters.confidence && filters.confidence !== 'all') {
      lookupsQuery = lookupsQuery.eq('terms.senses.confidence', filters.confidence);
    }

    // Apply date filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        lookupsQuery = lookupsQuery.gte('created_at', startDate.toISOString());
      }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    lookupsQuery = lookupsQuery.range(offset, offset + limit - 1);

    const { data: lookups, error: lookupsError } = await lookupsQuery;

    if (lookupsError) {
      throw lookupsError;
    }

    // Get favorites separately
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        terms (
          id,
          text,
          normalized_text,
          senses (
            meaning,
            tone,
            confidence
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (favoritesError) {
      throw favoritesError;
    }

    // Format the response
    const formattedLookups = lookups?.map(lookup => ({
      id: lookup.id,
      term: lookup.terms?.text || '',
      meaning: lookup.terms?.senses?.[0]?.meaning || '',
      tone: lookup.terms?.senses?.[0]?.tone || 'neutral',
      confidence: lookup.terms?.senses?.[0]?.confidence || 'Low',
      created_at: lookup.created_at,
      is_favorite: lookup.favorites?.length > 0
    })) || [];

    const formattedFavorites = favorites?.map(favorite => ({
      id: favorite.id,
      term: favorite.terms?.text || '',
      meaning: favorite.terms?.senses?.[0]?.meaning || '',
      tone: favorite.terms?.senses?.[0]?.tone || 'neutral',
      confidence: favorite.terms?.senses?.[0]?.confidence || 'Low',
      created_at: favorite.created_at,
      is_favorite: true
    })) || [];

    return new Response(JSON.stringify({
      lookups: formattedLookups,
      favorites: formattedFavorites,
      pagination: {
        page,
        limit,
        hasMore: formattedLookups.length === limit
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in user-history function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});