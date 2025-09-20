import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Target, 
  Heart, 
  Zap, 
  Star,
  Globe,
  Calendar,
  Users
} from 'lucide-react';

export interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  earnedAt: string;
  data: any;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

const getAchievementIcon = (type: string) => {
  switch (type) {
    case 'first_viral':
      return <Flame className="h-4 w-4" />;
    case 'cross_platform_king':
      return <Globe className="h-4 w-4" />;
    case 'vibe_master':
      return <Crown className="h-4 w-4" />;
    case 'week_champion':
      return <Trophy className="h-4 w-4" />;
    case 'community_favorite':
      return <Heart className="h-4 w-4" />;
    case 'speed_creator':
      return <Zap className="h-4 w-4" />;
    case 'consistency_king':
      return <Target className="h-4 w-4" />;
    case 'social_butterfly':
      return <Users className="h-4 w-4" />;
    case 'streak_master':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Star className="h-4 w-4" />;
  }
};

const getAchievementColor = (type: string) => {
  switch (type) {
    case 'first_viral':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cross_platform_king':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'vibe_master':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'week_champion':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'community_favorite':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case 'speed_creator':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'consistency_king':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'social_butterfly':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'streak_master':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'md',
  showDescription = false
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="outline"
        className={`
          ${getAchievementColor(achievement.type)} 
          ${sizeClasses[size]} 
          flex items-center gap-1 w-fit
        `}
      >
        <span className={iconSize[size]}>
          {getAchievementIcon(achievement.type)}
        </span>
        {achievement.name}
      </Badge>
      {showDescription && (
        <p className="text-xs text-muted-foreground max-w-xs">
          {achievement.description}
        </p>
      )}
    </div>
  );
};

export default AchievementBadge;