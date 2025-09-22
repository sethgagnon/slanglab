import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Crown, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApproachingLimitBannerProps {
  usedCount: number;
  totalLimit: number;
  limitType: 'searches' | 'ai-creations' | 'manual-creations';
  plan: string;
  className?: string;
}

export const ApproachingLimitBanner: React.FC<ApproachingLimitBannerProps> = ({
  usedCount,
  totalLimit,
  limitType,
  plan,
  className = ""
}) => {
  // Don't show for unlimited plans
  if (totalLimit === -1) return null;
  
  // Calculate percentage used
  const percentage = (usedCount / totalLimit) * 100;
  
  // Only show when approaching limit (80%+) or exceeded
  if (percentage < 80) return null;

  const getContent = () => {
    const remaining = Math.max(0, totalLimit - usedCount);
    const isExceeded = usedCount >= totalLimit;
    
    if (isExceeded) {
      return getLimitExceededContent();
    }
    
    switch (limitType) {
      case 'searches':
        return {
          title: `${remaining} Search${remaining === 1 ? '' : 'es'} Left Today`,
          description: "You're almost at your daily limit. Upgrade for unlimited searches!",
          cta: "Upgrade for Unlimited",
          upgradeText: "SearchPro gets unlimited searches + 3 AI creations/week",
          upgradePrice: "$1.99/mo"
        };
      
      case 'ai-creations':
        return {
          title: `${remaining} AI Creation${remaining === 1 ? '' : 's'} Left`,
          description: plan === 'Free' ? "You're running low on weekly AI creations!" : "You're running low on AI creations!",
          cta: "Upgrade Plan",
          upgradeText: plan === 'Free' ? "SearchPro: 3/week → LabPro: 2/day" : "LabPro: 2 AI creations per day",
          upgradePrice: plan === 'Free' ? "From $1.99/mo" : "$3.99/mo"
        };
      
      case 'manual-creations':
        return {
          title: `${remaining} Manual Creation${remaining === 1 ? '' : 's'} Left`,
          description: "Almost at your weekly manual creation limit!",
          cta: "Upgrade to LabPro",
          upgradeText: "LabPro: Unlimited manual creations + advanced tracking",
          upgradePrice: "$3.99/mo"
        };
      
      default:
        return { title: '', description: '', cta: '', upgradeText: '', upgradePrice: '' };
    }
  };

  const getLimitExceededContent = () => {
    switch (limitType) {
      case 'searches':
        return {
          title: 'Daily Search Limit Reached',
          description: 'Upgrade now for unlimited searches and creation features!',
          cta: 'Upgrade Now',
          upgradeText: 'SearchPro: Unlimited searches + 3 AI creations/week',
          upgradePrice: '$1.99/mo'
        };
      
      case 'ai-creations':
        return {
          title: 'AI Creation Limit Reached',
          description: plan === 'Free' ? 'Weekly limit reached. Upgrade for more!' : 'Daily limit reached. Try LabPro!',
          cta: 'Upgrade Plan',
          upgradeText: plan === 'Free' ? 'SearchPro: 3/week or LabPro: 2/day' : 'LabPro: 2 AI creations per day',
          upgradePrice: plan === 'Free' ? 'From $1.99/mo' : '$3.99/mo'
        };
      
      case 'manual-creations':
        return {
          title: 'Manual Creation Limit Reached',
          description: 'Weekly limit reached. Upgrade for unlimited manual creations!',
          cta: 'Get LabPro',
          upgradeText: 'LabPro: Unlimited manual creations + tracking',
          upgradePrice: '$3.99/mo'
        };
      
      default:
        return { title: '', description: '', cta: '', upgradeText: '', upgradePrice: '' };
    }
  };

  const content = getContent();
  const isExceeded = usedCount >= totalLimit;

  return (
    <Alert className={`${className} ${isExceeded ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/5'}`}>
      <div className="flex items-center gap-3">
        {isExceeded ? (
          <Zap className="h-5 w-5 text-destructive" />
        ) : (
          <TrendingUp className="h-5 w-5 text-warning" />
        )}
        
        <div className="flex-1">
          <h4 className="font-medium text-sm">{content.title}</h4>
          <AlertDescription className="mt-1">
            {content.description}
          </AlertDescription>
          
          <div className="mt-3 flex items-center gap-3">
            <Button asChild size="sm" variant={isExceeded ? 'destructive' : 'default'}>
              <Link to="/account?tab=usage">
                {limitType === 'searches' ? <Crown className="w-4 h-4 mr-1" /> : <Users className="w-4 h-4 mr-1" />}
                {content.cta}
              </Link>
            </Button>
            
            <div className="text-xs text-muted-foreground">
              <div className="font-medium">{content.upgradeText}</div>
              <Badge variant="outline" className="mt-1">
                {content.upgradePrice}
              </Badge>
            </div>
          </div>
        </div>
        
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Alert>
  );
};