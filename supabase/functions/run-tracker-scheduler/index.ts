import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Starting scheduled tracker run...');

    // Get all active trackers
    const { data: activeTrackers, error: trackersError } = await supabase
      .from('trackers')
      .select(`
        term_id,
        sources_enabled,
        sensitivity,
        last_run_at,
        terms (
          id,
          text,
          normalized_text,
          user_id,
          profiles (
            email,
            name
          )
        )
      `)
      .not('terms.user_id', 'is', null); // Only get trackers with valid terms

    if (trackersError) {
      console.error('Error fetching active trackers:', trackersError);
      throw trackersError;
    }

    console.log(`📊 Found ${activeTrackers?.length || 0} active trackers`);

    let successCount = 0;
    let errorCount = 0;

    // Process each tracker
    for (const tracker of activeTrackers || []) {
      try {
        console.log(`🔍 Running tracker for term: ${tracker.terms.text}`);

        // Call the run_tracker function for this specific tracker
        const { data: result, error: runError } = await supabase.functions.invoke('run_tracker', {
          body: {
            term_id: tracker.term_id
          }
        });

        if (runError) {
          console.error(`❌ Error running tracker for ${tracker.terms.text}:`, runError);
          errorCount++;
          continue;
        }

        console.log(`✅ Successfully ran tracker for ${tracker.terms.text}:`, result);

        // Update last_run_at timestamp
        await supabase
          .from('trackers')
          .update({ last_run_at: new Date().toISOString() })
          .eq('term_id', tracker.term_id);

        successCount++;

        // Check if this run found new high-score sightings and trigger notifications
        if (result?.qualifiedSightings?.length > 0) {
          console.log(`📧 Triggering notifications for ${result.qualifiedSightings.length} new sightings`);
          
          // Call notify_creator for first sighting notifications
          await supabase.functions.invoke('notify-creator', {
            body: {
              type: 'first_sighting',
              userId: tracker.terms.user_id,
              termId: tracker.term_id,
              sightings: result.qualifiedSightings
            }
          });
        }

      } catch (error) {
        console.error(`❌ Failed to process tracker for ${tracker.terms?.text}:`, error);
        errorCount++;
      }
    }

    const summary = {
      totalTrackers: activeTrackers?.length || 0,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    };

    console.log('📈 Scheduler run completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in tracker scheduler:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});