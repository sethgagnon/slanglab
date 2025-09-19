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
    const { creationId, value } = await req.json();
    console.log('Vote action:', creationId, value);

    if (!creationId || (value !== 1 && value !== -1)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Check if user has already voted on this creation
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('creation_id', creationId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error } = await supabase
        .from('votes')
        .update({ value })
        .eq('id', existingVote.id);

      if (error) {
        throw error;
      }
    } else {
      // Create new vote
      const { error } = await supabase
        .from('votes')
        .insert({
          creation_id: creationId,
          user_id: user.id,
          value
        });

      if (error) {
        throw error;
      }
    }

    // Get updated vote count
    const { data: votes } = await supabase
      .from('votes')
      .select('value')
      .eq('creation_id', creationId);

    const totalScore = votes?.reduce((sum, vote) => sum + vote.value, 0) || 0;

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Vote recorded',
      newScore: totalScore
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vote-creation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});