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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting slang monitoring check...');

    // Get date 7 days ago for filtering
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch creations that need monitoring (only for LabPro users)
    const { data: monitoringData, error: fetchError } = await supabase
      .from('creation_monitoring')
      .select(`
        id,
        creation_id,
        user_id,
        monitoring_started_at,
        last_checked_at,
        times_found,
        trending_score,
        status,
        platforms_detected,
        creations!inner(phrase, meaning, example),
        profiles!inner(plan, role)
      `)
      .or('last_checked_at.is.null,last_checked_at.lt.' + weekAgo)
      .eq('status', 'monitoring')
      .or('profiles.plan.eq.labpro,profiles.role.eq.admin')
      .limit(50);

    if (fetchError) {
      console.error('Error fetching monitoring data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch monitoring data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${monitoringData?.length || 0} creations to monitor`);

    const results = [];

    for (const monitoring of monitoringData || []) {
      const creation = monitoring.creations;
      const searchTerm = creation.phrase;

      console.log(`Monitoring slang: "${searchTerm}"`);

      try {
        // Use the existing lookup-term logic to search for the slang
        const { data: searchData, error: searchError } = await supabase.functions.invoke('lookup-term', {
          body: {
            term: searchTerm,
            isAnonymous: false
          }
        });

        let foundCount = 0;
        let newPlatforms: string[] = [...(monitoring.platforms_detected || [])];
        let foundInWild = false;

        if (searchData && !searchError) {
          // Check if the slang appears in search results with meaningful context
          const senses = searchData.senses || [];
          
          for (const sense of senses) {
            const sources = sense.sources || [];
            
            for (const source of sources) {
              // Check if the snippet contains the slang in a contextual way (not just a definition)
              const snippet = source.snippet.toLowerCase();
              const phrase = searchTerm.toLowerCase();
              
              if (snippet.includes(phrase) && !snippet.includes('definition') && !snippet.includes('meaning')) {
                foundCount++;
                foundInWild = true;
                
                // Extract platform from URL
                const url = source.url;
                let platform = 'web';
                if (url.includes('tiktok.com')) platform = 'tiktok';
                else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
                else if (url.includes('instagram.com')) platform = 'instagram';
                else if (url.includes('reddit.com')) platform = 'reddit';
                else if (url.includes('youtube.com')) platform = 'youtube';
                
                if (!newPlatforms.includes(platform)) {
                  newPlatforms.push(platform);
                }
              }
            }
          }
        }

        // Calculate new status and trending score
        let newStatus = monitoring.status;
        let newTrendingScore = monitoring.trending_score;
        
        if (foundInWild) {
          newTrendingScore += foundCount * 10;
          
          if (monitoring.status === 'monitoring') {
            newStatus = 'spotted';
          } else if (newTrendingScore > 100) {
            newStatus = 'trending';
          }
        } else if (monitoring.status === 'spotted' && 
                  monitoring.last_checked_at && 
                  new Date(monitoring.last_checked_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
          // Mark as dormant if no activity for 30 days
          newStatus = 'dormant';
        }

        // Update monitoring record
        const { error: updateError } = await supabase
          .from('creation_monitoring')
          .update({
            last_checked_at: new Date().toISOString(),
            times_found: monitoring.times_found + foundCount,
            trending_score: newTrendingScore,
            status: newStatus,
            platforms_detected: newPlatforms,
            ...(foundInWild ? { last_found_at: new Date().toISOString() } : {})
          })
          .eq('id', monitoring.id);

        if (updateError) {
          console.error(`Error updating monitoring for ${searchTerm}:`, updateError);
        } else {
          console.log(`Updated monitoring for "${searchTerm}": found ${foundCount} times, status: ${newStatus}`);
        }

        results.push({
          phrase: searchTerm,
          foundCount,
          newStatus,
          platforms: newPlatforms
        });

      } catch (error) {
        console.error(`Error monitoring ${searchTerm}:`, error);
        results.push({
          phrase: searchTerm,
          error: error.message
        });
      }

      // Add small delay to avoid overwhelming the search API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Monitoring check completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        monitored: monitoringData?.length || 0,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monitor-shared-slang function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});