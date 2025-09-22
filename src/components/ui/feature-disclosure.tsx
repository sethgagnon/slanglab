import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Users, TrendingUp, Zap, BarChart3, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureDisclosureProps {
  feature: 'tracking' | 'unlimited-searches' | 'ai-creations' | 'analytics' | 'notifications';
  plan: string;
  variant?: 'card' | 'inline' | 'minimal';
  className?: string;
}

export const FeatureDisclosure: React.FC<FeatureDisclosureProps> = ({
  feature,
  plan,
  variant = 'card',
  className = ""
}) => {
  // Don't show for users who already have access
  const hasAccess = () => {
    switch (feature) {
      case 'tracking':
        return plan === 'LabPro' || plan === 'Admin';
      case 'unlimited-searches':
        return plan === 'SearchPro' || plan === 'LabPro' || plan === 'Admin';
      case 'ai-creations':
        return plan !== 'Free';
      case 'analytics':
        return plan === 'LabPro' || plan === 'Admin';
      case 'notifications':
        return plan === 'LabPro' || plan === 'Admin';
      default:
        return false;
    }
  };

  if (hasAccess()) return null;

  const getFeatureContent = () => {
    switch (feature) {
      case 'tracking':
        return {
          title: 'Track Your Viral Slang',
          description: 'See how your creations spread across Reddit, TikTok, Twitter and more',
          icon: TrendingUp,
          benefits: ['Real-time platform monitoring', 'Viral score tracking', 'Weekly digest reports'],
          requiredPlan: 'LabPro',
          price: '$3.99/mo',
          social: '95% see results in 7 days',
          priceId: 'price_1SADmrDt8zpU0lE0PKZLjhJA'
        };
      
      case 'unlimited-searches':
        return {
          title: 'Unlimited Daily Searches',
          description: 'Never run out of lookups again with SearchPro or LabPro',
          icon: Zap,
          benefits: ['Unlimited daily searches', 'No more waiting', 'Priority processing'],
          requiredPlan: 'SearchPro',
          price: '$1.99/mo',
          social: 'Most popular upgrade',
          priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL'
        };
      
      case 'ai-creations':
        return {
          title: 'More AI Creations',
          description: 'Generate more viral slang with SearchPro (3/week) or LabPro (2/day)',
          icon: Zap,
          benefits: ['More AI generations', 'Higher quality output', 'Advanced prompting'],
          requiredPlan: 'SearchPro',
          price: 'From $1.99/mo',
          social: 'Creators make 3x more viral content',
          priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL'
        };
      
      case 'analytics':
        return {
          title: 'Advanced Analytics',
          description: 'Deep insights into your slang performance and trending patterns',
          icon: BarChart3,
          benefits: ['Performance analytics', 'Trend insights', 'Creator leaderboards'],
          requiredPlan: 'LabPro',
          price: '$3.99/mo',
          social: 'Data-driven creators love this',
          priceId: 'price_1SADmrDt8zpU0lE0PKZLjhJA'
        };
      
      case 'notifications':
        return {
          title: 'Smart Notifications',
          description: 'Get notified when your slang goes viral or trends on platforms',
          icon: Bell,
          benefits: ['Real-time alerts', 'Viral notifications', 'Weekly summaries'],
          requiredPlan: 'LabPro',
          price: '$3.99/mo',
          social: 'Never miss a viral moment',
          priceId: 'price_1SADmrDt8zpU0lE0PKZLjhJA'
        };
      
      default:
        return {
          title: 'Premium Feature',
          description: 'Unlock this feature with an upgrade',
          icon: Lock,
          benefits: ['Enhanced functionality'],
          requiredPlan: 'Pro',
          price: '$1.99/mo',
          social: 'Popular feature',
          priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL'
        };
    }
  };

  const content = getFeatureContent();
  const IconComponent = content.icon;

  if (variant === 'minimal') {
    return (
      <div className={`${className} flex items-center gap-2 p-3 border rounded-lg bg-muted/30`}>
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{content.title}</span>
        <Badge variant="outline" className="text-xs">
          {content.requiredPlan}
        </Badge>
        <Button asChild size="sm" variant="outline">
          <Link to="/account?tab=usage">
            Unlock
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`${className} border rounded-lg p-4 bg-gradient-to-r from-muted/50 to-primary/5`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{content.title}</h4>
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{content.description}</p>
            
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {content.social}
              </Badge>
              <Button asChild size="sm">
                <Link to="/account?tab=usage">
                  Get {content.requiredPlan} - {content.price}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={`${className} border-dashed bg-gradient-to-br from-muted/30 to-primary/5`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{content.title}</CardTitle>
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {content.description}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <ul className="text-sm space-y-1">
            {content.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                {benefit}
              </li>
            ))}
          </ul>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {content.social}
            </Badge>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{content.price}</span>
              <Button asChild size="sm">
                <Link to="/account?tab=usage">
                  {content.requiredPlan === 'SearchPro' ? <Crown className="w-4 h-4 mr-1" /> : <Users className="w-4 h-4 mr-1" />}
                  Get {content.requiredPlan}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};