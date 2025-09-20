import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting leaderboard calculation...');

    // Calculate viral scores based on monitoring data
    const { data: monitoringData, error: monitoringError } = await supabase
      .from('creation_monitoring')
      .select(`
        user_id,
        status,
        times_found,
        trending_score,
        platforms_detected,
        creations!inner(
          vibe,
          created_at
        ),
        votes:votes(value)
      `);

    if (monitoringError) {
      console.error('Error fetching monitoring data:', monitoringError);
      throw monitoringError;
    }

    console.log(`Processing ${monitoringData?.length || 0} monitoring records...`);

    // Calculate scores for each user
    const userScores = new Map<string, {
      viralScore: number;
      trendingCount: number;
      spottedCount: number;
      platformCount: number;
      totalVotes: number;
      favoriteVibe: string;
      bestCreationId?: string;
    }>();

    monitoringData?.forEach(record => {
      const userId = record.user_id;
      const current = userScores.get(userId) || {
        viralScore: 0,
        trendingCount: 0,
        spottedCount: 0,
        platformCount: 0,
        totalVotes: 0,
        favoriteVibe: '',
        bestCreationId: undefined
      };

      // Calculate viral score based on status and activity
      let score = 0;
      if (record.status === 'trending') {
        score = 100 + (record.trending_score || 0);
        current.trendingCount++;
      } else if (record.status === 'spotted') {
        score = 50 + (record.times_found || 0) * 5;
        current.spottedCount++;
      } else if (record.status === 'monitoring') {
        score = 10;
      }

      // Platform bonus
      const platforms = record.platforms_detected || [];
      if (platforms.length >= 3) score *= 2;
      if (platforms.length >= 4) score *= 1.5;
      
      current.viralScore += score;
      current.platformCount = Math.max(current.platformCount, platforms.length);

      // Calculate total votes
      const votes = (record.votes as any[]) || [];
      const voteSum = votes.reduce((sum, vote) => sum + vote.value, 0);
      current.totalVotes += voteSum;

      // Track favorite vibe (simple frequency count)
      const vibe = (record.creations as any)?.vibe;
      if (vibe) {
        current.favoriteVibe = vibe; // Simplified - in production, track frequency
      }

      userScores.set(userId, current);
    });

    console.log(`Calculated scores for ${userScores.size} users`);

    // Update creator_stats table
    for (const [userId, stats] of userScores) {
      const { error: upsertError } = await supabase
        .from('creator_stats')
        .upsert({
          user_id: userId,
          total_viral_score: stats.viralScore,
          favorite_vibe: stats.favoriteVibe,
          total_creations: stats.trendingCount + stats.spottedCount,
          // Keep existing values for streaks and days_active for now
        });

      if (upsertError) {
        console.error(`Error updating creator stats for user ${userId}:`, upsertError);
      }
    }

    // Update leaderboards for different periods
    const periods = ['all_time', 'weekly', 'monthly'];
    
    for (const period of periods) {
      // Calculate period-specific data
      let periodStart: Date | null = null;
      if (period === 'weekly') {
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 7);
      } else if (period === 'monthly') {
        periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Get sorted user scores
      const sortedUsers = Array.from(userScores.entries())
        .sort(([, a], [, b]) => b.viralScore - a.viralScore);

      // Clear existing leaderboard entries for this period
      const { error: deleteError } = await supabase
        .from('leaderboards')
        .delete()
        .eq('period_type', period);

      if (deleteError) {
        console.error(`Error clearing ${period} leaderboard:`, deleteError);
        continue;
      }

      // Insert new leaderboard entries
      const leaderboardEntries = sortedUsers.map(([userId, stats], index) => ({
        user_id: userId,
        period_type: period,
        period_start: periodStart?.toISOString().split('T')[0] || null,
        period_end: period === 'all_time' ? null : new Date().toISOString().split('T')[0],
        viral_score: stats.viralScore,
        trending_count: stats.trendingCount,
        spotted_count: stats.spottedCount,
        platform_count: stats.platformCount,
        total_votes: stats.totalVotes,
        rank_position: index + 1
      }));

      if (leaderboardEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('leaderboards')
          .insert(leaderboardEntries);

        if (insertError) {
          console.error(`Error inserting ${period} leaderboard:`, insertError);
        } else {
          console.log(`Updated ${period} leaderboard with ${leaderboardEntries.length} entries`);
        }
      }
    }

    // Check for new achievements
    await checkAndAwardAchievements(supabase, userScores);

    console.log('Leaderboard calculation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Leaderboards updated successfully',
        usersProcessed: userScores.size
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating leaderboards:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update leaderboards',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkAndAwardAchievements(supabase: any, userScores: Map<string, any>) {
  console.log('Checking for new achievements...');

  for (const [userId, stats] of userScores) {
    const achievementsToAward = [];

    // First Viral Achievement
    if (stats.trendingCount >= 1) {
      const { data: existingAchievement } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_type', 'first_viral')
        .maybeSingle();

      if (!existingAchievement) {
        achievementsToAward.push({
          user_id: userId,
          achievement_type: 'first_viral',
          achievement_data: { trending_count: stats.trendingCount }
        });
      }
    }

    // Cross-Platform King Achievement
    if (stats.platformCount >= 4) {
      const { data: existingAchievement } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_type', 'cross_platform_king')
        .maybeSingle();

      if (!existingAchievement) {
        achievementsToAward.push({
          user_id: userId,
          achievement_type: 'cross_platform_king',
          achievement_data: { platform_count: stats.platformCount }
        });
      }
    }

    // Community Favorite Achievement (high vote ratio)
    if (stats.totalVotes >= 10) {
      const { data: existingAchievement } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_type', 'community_favorite')
        .maybeSingle();

      if (!existingAchievement) {
        achievementsToAward.push({
          user_id: userId,
          achievement_type: 'community_favorite',
          achievement_data: { total_votes: stats.totalVotes }
        });
      }
    }

    // Award new achievements
    if (achievementsToAward.length > 0) {
      const { error: achievementError } = await supabase
        .from('achievements')
        .insert(achievementsToAward);

      if (achievementError) {
        console.error(`Error awarding achievements for user ${userId}:`, achievementError);
      } else {
        console.log(`Awarded ${achievementsToAward.length} achievements to user ${userId}`);
      }
    }
  }
}
