import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phrase, meaning, example } = await req.json();

    // Validate input
    if (!phrase || !meaning || !example) {
      return new Response(
        JSON.stringify({ error: 'Phrase, meaning, and example are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phrase length (1-3 words)
    const wordCount = phrase.trim().split(/\s+/).length;
    if (wordCount > 3) {
      return new Response(
        JSON.stringify({ error: 'Phrase must be 1-3 words only' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content length
    if (phrase.length > 100 || meaning.length > 500 || example.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Content too long. Phrase: max 100 chars, Meaning/Example: max 500 chars each' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to check plan
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan, role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isLabPro = profile?.plan === 'labpro';

    // Check usage limits for non-admin users
    if (!isAdmin) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get weekly usage for Free users
      const { data: weekStartData } = await supabaseClient
        .rpc('get_week_start')
        .maybeSingle();
      
      const weekStart = weekStartData;
      
      // Get current usage
      const { data: weeklyLimits } = await supabaseClient
        .from('limits')
        .select('manual_generations_used')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      const manualGenerationsUsed = weeklyLimits?.manual_generations_used || 0;

      // Check limits based on plan
      if (!isLabPro && manualGenerationsUsed >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'Manual creation limit reached',
            message: 'Free users can create 3 manual slang entries per week. Upgrade to LabPro for unlimited manual creations.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create the manual slang entry
    const { data: creation, error: creationError } = await supabaseClient
      .from('creations')
      .insert([
        {
          user_id: user.id,
          phrase: phrase.trim(),
          meaning: meaning.trim(),
          example: example.trim(),
          creation_type: 'manual',
          vibe: 'custom', // Default vibe for manual creations
          safe_flag: true // Manual creations are assumed safe by default
        }
      ])
      .select()
      .single();

    if (creationError) {
      console.error('Error creating manual slang:', creationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create slang entry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update usage limits for non-admin, non-LabPro users
    if (!isAdmin && !isLabPro) {
      const today = new Date().toISOString().split('T')[0];
      const { data: weekStartData } = await supabaseClient
        .rpc('get_week_start')
        .maybeSingle();
      
      const weekStart = weekStartData;

      // Update or insert limits record
      const { error: limitError } = await supabaseClient
        .from('limits')
        .upsert([
          {
            user_id: user.id,
            date: today,
            week_start_date: weekStart,
            manual_generations_used: 1
          }
        ], {
          onConflict: 'user_id,week_start_date',
          ignoreDuplicates: false
        });

      if (limitError) {
        console.error('Error updating usage limits:', limitError);
        // Don't fail the creation, just log the error
      }
    }

    console.log(`Manual slang created successfully for user ${user.id}: ${phrase}`);

    return new Response(
      JSON.stringify({ 
        creation,
        message: 'Manual slang created successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-manual-slang function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});