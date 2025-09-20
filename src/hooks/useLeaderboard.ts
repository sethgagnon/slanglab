import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  viralScore: number;
  trendingCount: number;
  achievements: string[];
  isCurrentUser?: boolean;
}

interface UseLeaderboardResult {
  leaderboardData: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refreshLeaderboard: () => void;
}

export const useLeaderboard = (periodType = 'all_time', limit = 10): UseLeaderboardResult => {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch leaderboard data with user profiles
      const { data: leaderboardEntries, error: leaderboardError } = await supabase
        .from('leaderboards')
        .select(`
          *,
          profiles!inner(name)
        `)
        .eq('period_type', periodType)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (leaderboardError) throw leaderboardError;

      // Fetch achievements for top users
      const userIds = leaderboardEntries?.map(entry => entry.user_id) || [];
      const { data: achievements } = await supabase
        .from('achievements')
        .select('user_id, achievement_type')
        .in('user_id', userIds);

      // Combine data
      const formattedData: LeaderboardEntry[] = (leaderboardEntries || []).map(entry => ({
        rank: entry.rank_position || 0,
        userId: entry.user_id,
        name: (entry.profiles as any)?.name || 'Anonymous',
        viralScore: entry.viral_score,
        trendingCount: entry.trending_count,
        achievements: (achievements || [])
          .filter(achievement => achievement.user_id === entry.user_id)
          .map(a => a.achievement_type),
        isCurrentUser: user?.id === entry.user_id
      }));

      setLeaderboardData(formattedData);

    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      setError(error.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [periodType, limit, user?.id]);

  const refreshLeaderboard = () => {
    fetchLeaderboard();
  };

  return {
    leaderboardData,
    loading,
    error,
    refreshLeaderboard
  };
};