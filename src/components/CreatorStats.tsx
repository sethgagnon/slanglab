import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Calendar, 
  Globe, 
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import AchievementBadge, { Achievement } from '@/components/AchievementBadge';
import { useToast } from '@/hooks/use-toast';

interface CreatorStatsData {
  totalCreations: number;
  totalViralScore: number;
  bestCreationId: string | null;
  favoriteVibe: string | null;
  daysActive: number;
  longestStreak: number;
  currentStreak: number;
  isPublic: boolean;
  achievements: Achievement[];
  currentRank: number | null;
}

const CreatorStats: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<CreatorStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCreatorStats();
    }
  }, [user]);

  const fetchCreatorStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch creator stats
      const { data: creatorStats, error: statsError } = await supabase
        .from('creator_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statsError) throw statsError;

      // Fetch achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Fetch current rank
      const { data: leaderboardEntry } = await supabase
        .from('leaderboards')
        .select('rank_position')
        .eq('user_id', user.id)
        .eq('period_type', 'all_time')
        .maybeSingle();

      const formattedAchievements: Achievement[] = (achievements || []).map(a => ({
        id: a.id,
        type: a.achievement_type,
        name: getAchievementName(a.achievement_type),
        description: getAchievementDescription(a.achievement_type),
        earnedAt: a.earned_at,
        data: (a.achievement_data as any) || {}
      }));

      setStats({
        totalCreations: creatorStats?.total_creations || 0,
        totalViralScore: creatorStats?.total_viral_score || 0,
        bestCreationId: creatorStats?.best_creation_id || null,
        favoriteVibe: creatorStats?.favorite_vibe || null,
        daysActive: creatorStats?.days_active || 0,
        longestStreak: creatorStats?.longest_streak || 0,
        currentStreak: creatorStats?.current_streak || 0,
        isPublic: creatorStats?.is_public ?? true,
        achievements: formattedAchievements,
        currentRank: leaderboardEntry?.rank_position || null
      });

    } catch (error: any) {
      console.error('Error fetching creator stats:', error);
      toast({
        title: "Error",
        description: "Failed to load creator statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (isPublic: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('creator_stats')
        .upsert({
          user_id: user.id,
          is_public: isPublic
        });

      if (error) throw error;

      setStats(prev => prev ? { ...prev, isPublic } : null);
      
      toast({
        title: "Settings Updated",
        description: `Your profile is now ${isPublic ? 'public' : 'private'}`,
      });

    } catch (error: any) {
      console.error('Error updating privacy settings:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive"
      });
    }
  };

  const getAchievementName = (type: string): string => {
    const names: Record<string, string> = {
      first_viral: "First Viral",
      cross_platform_king: "Cross-Platform King",
      vibe_master: "Vibe Master",
      week_champion: "Week Champion",
      community_favorite: "Community Favorite"
    };
    return names[type] || "Achievement";
  };

  const getAchievementDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      first_viral: "Created your first viral slang",
      cross_platform_king: "Slang detected on 4+ platforms",
      vibe_master: "Top creator in a specific vibe category",
      week_champion: "Most viral slang of the week",
      community_favorite: "Highest community vote ratio"
    };
    return descriptions[type] || "Special achievement unlocked";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No creator statistics available yet.</p>
          <p className="text-sm text-muted-foreground">Create some slang to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Creator Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalViralScore.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Viral Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalCreations}</p>
              <p className="text-sm text-muted-foreground">Total Creations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.currentRank ? `#${stats.currentRank}` : 'Unranked'}</p>
              <p className="text-sm text-muted-foreground">Global Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.achievements.length}</p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity & Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-semibold">{stats.daysActive}</p>
              <p className="text-sm text-muted-foreground">Days Active</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{stats.currentStreak}</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{stats.longestStreak}</p>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
            </div>
          </div>
          {stats.favoriteVibe && (
            <div className="mt-4 text-center">
              <Badge variant="secondary" className="text-sm">
                Favorite Vibe: {stats.favoriteVibe}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      {stats.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Achievements ({stats.achievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.achievements.map(achievement => (
                <AchievementBadge 
                  key={achievement.id}
                  achievement={achievement}
                  showDescription={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stats.isPublic ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-600" />
              )}
              <Label htmlFor="public-profile">
                Public Profile
              </Label>
            </div>
            <Switch
              id="public-profile"
              checked={stats.isPublic}
              onCheckedChange={updatePrivacySettings}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.isPublic 
              ? "Your achievements and stats are visible on leaderboards" 
              : "Your profile is private and won't appear on public leaderboards"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorStats;