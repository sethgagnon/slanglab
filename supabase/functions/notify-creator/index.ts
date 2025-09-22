import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { FirstSightingEmail } from './_templates/first-sighting.tsx';
import { WeeklyDigestEmail } from './_templates/weekly-digest.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, userId, termId, sightings } = await req.json();
    
    console.log(`📧 Processing notification: ${type} for user ${userId}`);

    if (type === 'first_sighting') {
      return await handleFirstSightingNotification(userId, termId, sightings);
    } else if (type === 'weekly_digest') {
      return await handleWeeklyDigest();
    } else {
      throw new Error(`Unknown notification type: ${type}`);
    }

  } catch (error) {
    console.error('💥 Error in notify-creator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleFirstSightingNotification(userId: string, termId: string, sightings: any[]) {
  try {
    // Get user and notification preferences
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile?.email) {
      console.error('❌ User not found or no email:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Check notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no preferences exist, create default ones
    if (!preferences) {
      await supabase
        .from('notification_preferences')
        .insert({ user_id: userId });
    }

    // Skip if notifications are disabled
    if (preferences && (!preferences.email_enabled || !preferences.first_sighting_enabled)) {
      console.log('⏭️ Notifications disabled for user');
      return new Response(JSON.stringify({ skipped: 'notifications_disabled' }));
    }

    // Get term details
    const { data: term } = await supabase
      .from('terms')
      .select('text, slug')
      .eq('id', termId)
      .single();

    // Check if we've already sent notification for these sightings
    for (const sighting of sightings) {
      const { data: existingNotification } = await supabase
        .from('first_sighting_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('term_id', termId)
        .eq('sighting_id', sighting.id)
        .single();

      if (existingNotification) {
        console.log(`⏭️ Already sent notification for sighting ${sighting.id}`);
        continue;
      }

      // Send first sighting email
      const html = await renderAsync(
        React.createElement(FirstSightingEmail, {
          userName: userProfile.name || 'Creator',
          termText: term?.text || 'Your term',
          termSlug: term?.slug || '',
          sighting: sighting,
          unsubscribeToken: preferences?.unsubscribe_token || ''
        })
      );

      const { error: emailError } = await resend.emails.send({
        from: 'SlangLab <notifications@slanglab.app>',
        to: [userProfile.email],
        subject: `🎯 "${term?.text}" spotted in the wild!`,
        html,
      });

      if (emailError) {
        console.error('❌ Failed to send email:', emailError);
        throw emailError;
      }

      // Record that we sent this notification
      await supabase
        .from('first_sighting_notifications')
        .insert({
          user_id: userId,
          term_id: termId,
          sighting_id: sighting.id
        });

      console.log(`✅ Sent first sighting notification for ${term?.text}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      sentNotifications: sightings.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error sending first sighting notification:', error);
    throw error;
  }
}

async function handleWeeklyDigest() {
  try {
    console.log('📊 Starting weekly digest generation...');

    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday = 0
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    // Get all users with active trackers who haven't received this week's digest
    const { data: usersWithTrackers, error: usersError } = await supabase
      .from('trackers')
      .select(`
        terms (
          user_id,
          profiles (
            email,
            name
          )
        )
      `)
      .not('terms.user_id', 'is', null);

    if (usersError) {
      console.error('❌ Error fetching users with trackers:', usersError);
      throw usersError;
    }

    // Get unique users
    const uniqueUsers = [...new Map(
      usersWithTrackers
        ?.filter(t => t.terms?.user_id)
        .map(t => [t.terms.user_id, t.terms])
    ).values()];

    console.log(`👥 Found ${uniqueUsers.length} users with active trackers`);

    let digestsSent = 0;

    for (const user of uniqueUsers) {
      try {
        // Check if digest already sent this week
        const { data: existingDigest } = await supabase
          .from('digest_state')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('week_start_date', weekStart.toISOString().split('T')[0])
          .single();

        if (existingDigest) {
          console.log(`⏭️ Digest already sent this week for user ${user.user_id}`);
          continue;
        }

        // Check notification preferences
        const { data: preferences } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.user_id)
          .single();

        if (preferences && (!preferences.email_enabled || !preferences.weekly_digest_enabled)) {
          console.log(`⏭️ Weekly digest disabled for user ${user.user_id}`);
          continue;
        }

        // Get user's weekly stats
        const weeklyStats = await getUserWeeklyStats(user.user_id, weekStart);

        // Only send if there's activity
        if (weeklyStats.totalSightings === 0) {
          console.log(`⏭️ No activity this week for user ${user.user_id}`);
          continue;
        }

        // Send weekly digest email
        const html = await renderAsync(
          React.createElement(WeeklyDigestEmail, {
            userName: user.profiles?.name || 'Creator',
            weeklyStats: weeklyStats,
            weekStart: weekStart.toLocaleDateString(),
            unsubscribeToken: preferences?.unsubscribe_token || ''
          })
        );

        const { error: emailError } = await resend.emails.send({
          from: 'SlangLab <digest@slanglab.app>',
          to: [user.profiles.email],
          subject: `📈 Your weekly SlangLab digest - ${weeklyStats.totalSightings} new sightings!`,
          html,
        });

        if (emailError) {
          console.error(`❌ Failed to send digest to ${user.profiles.email}:`, emailError);
          continue;
        }

        // Record digest sent
        await supabase
          .from('digest_state')
          .upsert({
            user_id: user.user_id,
            week_start_date: weekStart.toISOString().split('T')[0],
            last_weekly_digest_sent: new Date().toISOString()
          });

        digestsSent++;
        console.log(`✅ Sent weekly digest to ${user.profiles.email}`);

      } catch (error) {
        console.error(`❌ Error sending digest to user ${user.user_id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      digestsSent,
      totalUsers: uniqueUsers.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in weekly digest:', error);
    throw error;
  }
}

async function getUserWeeklyStats(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Get user's terms and their sightings this week
  const { data: userTerms } = await supabase
    .from('terms')
    .select(`
      id,
      text,
      sightings (
        id,
        score,
        source,
        created_at,
        title,
        url
      )
    `)
    .eq('user_id', userId);

  // Filter sightings to this week
  const weeklyTerms = userTerms?.map(term => ({
    ...term,
    sightings: term.sightings.filter(s => {
      const sightingDate = new Date(s.created_at);
      return sightingDate >= weekStart && sightingDate < weekEnd;
    })
  })).filter(term => term.sightings.length > 0);

  const totalSightings = weeklyTerms?.reduce((sum, term) => sum + term.sightings.length, 0) || 0;
  const topSources = getTopSources(weeklyTerms);
  const sparklineData = generateWeeklySparkline(weeklyTerms, weekStart);

  return {
    totalSightings,
    termsTracked: weeklyTerms?.length || 0,
    topSources,
    sparklineData,
    topTerms: weeklyTerms?.slice(0, 3) || []
  };
}

function getTopSources(terms: any[]) {
  const sourceCounts = new Map();
  
  terms?.forEach(term => {
    term.sightings.forEach(sighting => {
      const count = sourceCounts.get(sighting.source) || 0;
      sourceCounts.set(sighting.source, count + 1);
    });
  });

  return Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source, count]) => ({ source, count }));
}

function generateWeeklySparkline(terms: any[], weekStart: Date) {
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    
    const dayCount = terms?.reduce((sum, term) => {
      return sum + term.sightings.filter(s => {
        const sightingDate = new Date(s.created_at);
        return sightingDate.toDateString() === date.toDateString();
      }).length;
    }, 0) || 0;

    return { day: i, count: dayCount };
  });

  return dailyData;
}