import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, Clock, Star, Zap, Users, Crown } from 'lucide-react';
import { useTrialManagement } from '@/hooks/useTrialManagement';

interface TrialOfferProps {
  recommendedPlan?: 'SearchPro' | 'LabPro';
  trigger: 'limit_reached' | 'high_usage' | 'feature_access' | 'time_based';
  className?: string;
  variant?: 'card' | 'banner' | 'modal';
  onTrialStart?: () => void;
  onDecline?: () => void;
}

export const TrialOffer: React.FC<TrialOfferProps> = ({
  recommendedPlan = 'SearchPro',
  trigger,
  className = "",
  variant = 'card',
  onTrialStart,
  onDecline
}) => {
  const { 
    startTrial, 
    shouldShowTrialOffer, 
    getTrialFeatures,
    isTrialActive 
  } = useTrialManagement();

  // Don't show if user can't start trial or already has one
  if (!shouldShowTrialOffer() || isTrialActive) {
    return null;
  }

  const handleStartTrial = () => {
    const success = startTrial({ 
      plan: recommendedPlan, 
      durationDays: 3 
    });
    
    if (success) {
      onTrialStart?.();
    }
  };

  const getOfferContent = () => {
    switch (trigger) {
      case 'limit_reached':
        return {
          title: 'Try before you buy! 🎯',
          subtitle: 'Hit your limit? Try 3 days of unlimited access',
          urgency: 'high',
          description: `Experience ${recommendedPlan} features risk-free for 3 days`,
          cta: 'Start Free Trial',
          disclaimer: 'No payment required. Cancel anytime.'
        };
      
      case 'high_usage':
        return {
          title: 'You\'re a power user! ⚡',
          subtitle: 'Perfect timing for a 3-day trial',
          urgency: 'medium',
          description: `See how ${recommendedPlan} supercharges your workflow`,
          cta: 'Try Free for 3 Days',
          disclaimer: 'Free trial, then regular pricing applies'
        };
      
      case 'feature_access':
        return {
          title: 'Unlock this feature! 🔓',
          subtitle: 'Try premium features for 3 days',
          urgency: 'medium',
          description: `Access tracking, analytics, and more with ${recommendedPlan}`,
          cta: 'Start Trial',
          disclaimer: 'Full access for 3 days, no commitment'
        };
      
      case 'time_based':
        return {
          title: 'Limited time: Free trial! ⏰',
          subtitle: 'Perfect timing to try premium features',
          urgency: 'high',
          description: `Experience everything ${recommendedPlan} offers`,
          cta: 'Claim Free Trial',
          disclaimer: '3 days free, then $1.99/mo'
        };
      
      default:
        return {
          title: 'Try premium features! ✨',
          subtitle: '3 days of unlimited access',
          urgency: 'low',
          description: `Test drive ${recommendedPlan} with no commitment`,
          cta: 'Start Free Trial',
          disclaimer: 'No payment required'
        };
    }
  };

  const content = getOfferContent();
  const features = getTrialFeatures();
  
  const getUrgencyColor = () => {
    switch (content.urgency) {
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-green-200 bg-green-50';
    }
  };

  if (variant === 'banner') {
    return (
      <Alert className={`${className} ${getUrgencyColor()}`}>
        <div className="flex items-center gap-3">
          <Gift className="h-5 w-5 text-primary" />
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">{content.title}</h4>
            <AlertDescription className="text-xs mt-1">
              {content.description}
            </AlertDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              3 days free
            </Badge>
            <Button size="sm" onClick={handleStartTrial}>
              <Gift className="w-3 h-3 mr-1" />
              {content.cta}
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Card variant
  return (
    <Card className={`${className} ${getUrgencyColor()} border-l-4 border-l-primary`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {content.title}
              {content.urgency === 'high' && (
                <Clock className="w-4 h-4 text-orange-500" />
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {content.subtitle}
            </p>
          </div>
          <Badge variant="outline" className="bg-white">
            <Star className="w-3 h-3 mr-1" />
            FREE
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {content.description}
        </p>

        {/* Trial Features Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">What you'll get:</h4>
          <ul className="text-sm space-y-1">
            {features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Section */}
        <div className="space-y-3">
          <Button 
            onClick={handleStartTrial}
            className="w-full"
            size="lg"
          >
            {recommendedPlan === 'LabPro' ? <Users className="w-4 h-4 mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
            {content.cta}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {content.disclaimer}
            </p>
          </div>
        </div>

        {/* Decline option */}
        {onDecline && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={onDecline}>
              No thanks, continue with limits
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};