import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Crown, Medal, Calendar, Globe, TrendingUp, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AchievementBadge, { Achievement } from '@/components/AchievementBadge';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardData {
  rank: number;
  userId: string;
  name: string;
  viralScore: number;
  trendingCount: number;
  platformCount: number;
  achievements: Achievement[];
  isCurrentUser?: boolean;
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all_time');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Fetch leaderboard data with user profiles
      const { data: leaderboardEntries, error: leaderboardError } = await supabase
        .from('leaderboards')
        .select(`
          *,
          profiles!inner(name)
        `)
        .eq('period_type', activeTab)
        .order('rank_position', { ascending: true })
        .limit(100);

      if (leaderboardError) throw leaderboardError;

      // Fetch achievements for each user
      const userIds = leaderboardEntries?.map(entry => entry.user_id) || [];
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .in('user_id', userIds);

      // Combine data
      const formattedData: LeaderboardData[] = (leaderboardEntries || []).map(entry => ({
        rank: entry.rank_position || 0,
        userId: entry.user_id,
        name: (entry.profiles as any)?.name || 'Anonymous',
        viralScore: entry.viral_score,
        trendingCount: entry.trending_count,
        platformCount: entry.platform_count,
        achievements: (achievements || [])
          .filter(achievement => achievement.user_id === entry.user_id)
          .map(a => ({
            id: a.id,
            type: a.achievement_type,
            name: getAchievementName(a.achievement_type),
            description: getAchievementDescription(a.achievement_type),
            earnedAt: a.earned_at,
            data: (a.achievement_data as any) || {}
          })),
        isCurrentUser: user?.id === entry.user_id
      }));

      setLeaderboardData(formattedData);
      
      // Set user rank
      const currentUserEntry = formattedData.find(entry => entry.isCurrentUser);
      setUserRank(currentUserEntry?.rank || null);

    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAchievementName = (type: string): string => {
    const names: Record<string, string> = {
      first_viral: "First Viral",
      cross_platform_king: "Cross-Platform King",
      vibe_master: "Vibe Master",
      week_champion: "Week Champion",
      community_favorite: "Community Favorite",
      speed_creator: "Speed Creator",
      consistency_king: "Consistency King",
      social_butterfly: "Social Butterfly",
      streak_master: "Streak Master"
    };
    return names[type] || "Achievement";
  };

  const getAchievementDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      first_viral: "Created your first viral slang",
      cross_platform_king: "Slang detected on 4+ platforms",
      vibe_master: "Top creator in a specific vibe category",
      week_champion: "Most viral slang of the week",
      community_favorite: "Highest community vote ratio",
      speed_creator: "Created trending slang within 24 hours",
      consistency_king: "Maintained weekly trending slang",
      social_butterfly: "Most shared slang creations",
      streak_master: "Longest streak of active trending slang"
    };
    return descriptions[type] || "Special achievement unlocked";
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 500) return "text-red-500";
    if (score >= 200) return "text-orange-500";
    if (score >= 100) return "text-yellow-500";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Creator Leaderboard
            </h1>
            <p className="text-muted-foreground">
              Top slang creators ranked by viral score
            </p>
          </div>
        </div>
        {userRank && (
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your Rank</p>
              <p className="text-2xl font-bold text-primary">#{userRank}</p>
            </div>
          </Card>
        )}
      </div>

      {/* Leaderboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all_time" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            All Time
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Week
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            This Month
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {leaderboardData.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-semibold">No Creators Yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to create viral slang and claim the top spot!
                  </p>
                </div>
                <Button onClick={() => navigate('/slang-lab')}>
                  Start Creating
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((entry, index) => (
                <Card 
                  key={entry.userId} 
                  className={`transition-all hover:shadow-md ${
                    entry.isCurrentUser 
                      ? 'ring-2 ring-primary/20 bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-lg font-semibold">
                            {entry.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${
                              entry.isCurrentUser ? 'text-primary' : ''
                            }`}>
                              {entry.name}
                            </h3>
                            {entry.isCurrentUser && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {entry.trendingCount} trending
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {entry.platformCount} platforms
                            </span>
                          </div>
                          {entry.achievements.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.achievements.slice(0, 3).map(achievement => (
                                <AchievementBadge 
                                  key={achievement.id}
                                  achievement={achievement}
                                  size="sm"
                                />
                              ))}
                              {entry.achievements.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{entry.achievements.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(entry.viralScore)}`}>
                          {entry.viralScore.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">viral score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;