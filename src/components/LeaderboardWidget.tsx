import React from 'react';
import { Trophy, Crown, Medal, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  viralScore: number;
  trendingCount: number;
  achievements: string[];
  isCurrentUser?: boolean;
}

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  title?: string;
  showFullLeaderboard?: boolean;
}

const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  entries,
  title = "Top Creators",
  showFullLeaderboard = true
}) => {
  const navigate = useNavigate();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 500) return "text-red-500";
    if (score >= 200) return "text-orange-500";
    if (score >= 100) return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {showFullLeaderboard && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/leaderboard')}
          >
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No creators on the leaderboard yet!</p>
            <p className="text-sm">Create viral slang to be the first.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div 
              key={entry.userId} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                entry.isCurrentUser 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {entry.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className={`font-medium text-sm ${
                    entry.isCurrentUser ? 'text-primary' : ''
                  }`}>
                    {entry.name}
                    {entry.isCurrentUser && (
                      <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.trendingCount} trending</span>
                    {entry.achievements.length > 0 && (
                      <Badge variant="outline" className="text-xs px-1">
                        {entry.achievements.length} achievements
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${getScoreColor(entry.viralScore)}`}>
                  {entry.viralScore.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">viral score</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardWidget;