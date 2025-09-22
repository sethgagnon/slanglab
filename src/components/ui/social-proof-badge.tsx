import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Star, Zap, Trophy, CheckCircle } from 'lucide-react';

interface SocialProofBadgeProps {
  type: 'user-count' | 'success-rate' | 'viral-rate' | 'satisfaction' | 'trending' | 'verified';
  plan?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const SocialProofBadge: React.FC<SocialProofBadgeProps> = ({
  type,
  plan = 'SearchPro',
  variant = 'outline',
  size = 'default',
  className = ""
}) => {
  const getProofContent = () => {
    switch (type) {
      case 'user-count':
        return {
          icon: Users,
          text: plan === 'LabPro' ? '500+ LabPro creators' : '2,000+ creators upgraded',
          color: 'text-blue-600'
        };
      
      case 'success-rate':
        return {
          icon: TrendingUp,
          text: '95% see viral results in 7 days',
          color: 'text-green-600'
        };
      
      case 'viral-rate':
        return {
          icon: Zap,
          text: plan === 'LabPro' ? 'LabPro users: 5x more viral' : 'Pro users: 3x more viral slang',
          color: 'text-orange-600'
        };
      
      case 'satisfaction':
        return {
          icon: Star,
          text: '4.9/5 creator satisfaction',
          color: 'text-yellow-600'
        };
      
      case 'trending':
        return {
          icon: Trophy,
          text: plan === 'LabPro' ? '#1 for power creators' : 'Most popular upgrade',
          color: 'text-purple-600'
        };
      
      case 'verified':
        return {
          icon: CheckCircle,
          text: 'Trusted by viral creators',
          color: 'text-green-600'
        };
      
      default:
        return {
          icon: Users,
          text: 'Join thousands of creators',
          color: 'text-blue-600'
        };
    }
  };

  const content = getProofContent();
  const IconComponent = content.icon;
  
  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <Badge 
      variant={variant} 
      className={`${className} ${sizeClasses[size]} flex items-center gap-1`}
    >
      <IconComponent className={`${iconSizes[size]} ${content.color}`} />
      {content.text}
    </Badge>
  );
};