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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { creation_id, user_id, platform, share_content, share_url } = await req.json();
    
    // Check if user has LabPro access for monitoring features
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, role')
      .eq('user_id', user_id)
      .single();
    
    const hasLabProAccess = profile?.role === 'admin' || profile?.plan === 'labpro';

    // Validate required fields
    if (!creation_id || !user_id || !platform) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: creation_id, user_id, or platform' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate platform
    const validPlatforms = [
      'twitter', 'facebook', 'instagram', 'snapchat', 'tiktok', 
      'reddit', 'linkedin', 'whatsapp', 'telegram', 'web_share', 'copy_link'
    ];
    
    if (!validPlatforms.includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key (if not already created)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert share record
    const { data, error } = await supabase
      .from('slang_shares')
      .insert({
        creation_id,
        user_id,
        platform,
        share_content: share_content || {},
        share_url,
        shared_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log share' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Only activate monitoring for LabPro users
    if (hasLabProAccess) {
      const { error: monitoringError } = await supabaseAdmin
        .from('creation_monitoring')
        .upsert({
          creation_id,
          user_id,
          monitoring_started_at: new Date().toISOString(),
          status: 'monitoring'
        }, {
          onConflict: 'creation_id,user_id',
          ignoreDuplicates: true
        });

      if (monitoringError) {
        console.log('Monitoring activation failed (non-critical):', monitoringError);
      } else {
        console.log('Monitoring activated for creation:', creation_id);
      }
    }

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log share' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Share logged successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in log-share function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});