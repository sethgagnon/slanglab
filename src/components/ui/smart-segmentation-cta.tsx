import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Zap, TrendingUp, Star, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyzeUserSegment, getSegmentedPricing } from '@/lib/userSegmentation';
import { useUpgradeMessageTest, usePricingEmphasisTest, useCtaVariantTest } from '@/hooks/useABTesting';

interface SmartSegmentationCtaProps {
  usage: {
    searchesUsed: number;
    searchesLimit: number;
    aiCreationsUsed: number;
    aiCreationsLimit: number;
    manualCreationsUsed: number;
    manualCreationsLimit: number;
    plan: string;
  };
  accountAge?: number;
  recentActivity?: number;
  className?: string;
  variant?: 'card' | 'inline' | 'minimal';
}

export const SmartSegmentationCta: React.FC<SmartSegmentationCtaProps> = ({
  usage,
  accountAge = 30,
  recentActivity = 3,
  className = "",
  variant = 'card'
}) => {
  // Don't show for paid plans
  if (usage.plan !== 'Free') return null;

  const segment = analyzeUserSegment(usage, accountAge, recentActivity);
  const pricing = getSegmentedPricing(segment, usage.plan);
  
  // A/B testing hooks
  const messageTest = useUpgradeMessageTest();
  const pricingTest = usePricingEmphasisTest();
  const ctaTest = useCtaVariantTest();

  // Get A/B tested messaging
  const getTestMessage = () => {
    switch (messageTest.variant) {
      case 'urgency':
        return {
          primary: `${segment.messaging.primary} (Limited time!)`,
          secondary: `${segment.messaging.secondary} - Don't miss out!`
        };
      case 'social_proof':
        return {
          primary: `${segment.messaging.primary}`,
          secondary: `Join 2,000+ creators who upgraded to ${segment.recommendedPlan}`
        };
      case 'value_focused':
        return {
          primary: 'Maximize your creativity potential',
          secondary: `${segment.recommendedPlan} gives you ${segment.messaging.benefits.join(', ')}`
        };
      default:
        return segment.messaging;
    }
  };

  const getTestPricing = () => {
    switch (pricingTest.variant) {
      case 'savings':
        return `Save $${((pricing.monthly * 12) - pricing.annual).toFixed(2)}/year`;
      case 'value_per_feature':
        return `Just $${(pricing.monthly / segment.messaging.benefits.length).toFixed(2)} per feature`;
      default:
        return pricing.monthlyDisplay;
    }
  };

  const getTestCta = () => {
    switch (ctaTest.variant) {
      case 'get_started':
        return 'Get Started';
      case 'unlock_features':
        return 'Unlock Features';
      case 'join_creators':
        return 'Join Creators';
      default:
        return 'Upgrade Now';
    }
  };

  const testMessage = getTestMessage();
  const testPricing = getTestPricing();
  const testCta = getTestCta();

  const getSegmentIcon = () => {
    switch (segment.type) {
      case 'heavy_creator':
        return Users;
      case 'search_power_user':
        return Zap;
      case 'trial_user':
        return Star;
      case 'at_risk':
        return TrendingUp;
      default:
        return Target;
    }
  };

  const getUrgencyColor = () => {
    switch (segment.urgency) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const IconComponent = getSegmentIcon();

  if (variant === 'minimal') {
    return (
      <div className={`${className} flex items-center gap-2 p-3 border rounded-lg ${getUrgencyColor()}`}>
        <IconComponent className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium flex-1">{testMessage.primary}</span>
        <Badge variant="outline" className="text-xs">
          {testPricing}
        </Badge>
        <Button asChild size="sm">
          <Link to="/account?tab=usage">{testCta}</Link>
        </Button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`${className} border rounded-lg p-4 ${getUrgencyColor()}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">{testMessage.primary}</h4>
            <p className="text-xs text-muted-foreground mt-1">{testMessage.secondary}</p>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {segment.confidence >= 0.8 ? 'Perfect fit' : 'Good match'}
                </Badge>
                {pricing.specialOffer && (
                  <Badge variant="outline" className="text-xs">
                    {pricing.specialOffer}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{testPricing}</span>
                <Button asChild size="sm">
                  <Link to="/account?tab=usage">
                    {segment.recommendedPlan === 'LabPro' ? <Users className="w-3 h-3 mr-1" /> : <Crown className="w-3 h-3 mr-1" />}
                    {testCta}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <Card className={`${className} ${getUrgencyColor()} border-l-4 border-l-primary`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{testMessage.primary}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {testMessage.secondary}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {segment.confidence >= 0.8 ? 'Perfect fit' : `${Math.round(segment.confidence * 100)}% match`}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Benefits for this segment */}
          <ul className="text-sm space-y-1">
            {segment.messaging.benefits.slice(0, 3).map((benefit, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                {benefit}
              </li>
            ))}
          </ul>
          
          {/* Special offer if available */}
          {pricing.specialOffer && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <Star className="w-4 h-4 inline mr-2 text-primary" />
              <span className="text-sm font-medium">{pricing.specialOffer}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{testPricing}</span>
              {pricingTest.variant === 'savings' && (
                <Badge variant="secondary" className="text-xs">
                  Best value
                </Badge>
              )}
            </div>
            
            <Button asChild size="lg">
              <Link to="/account?tab=usage">
                {segment.recommendedPlan === 'LabPro' ? <Users className="w-4 h-4 mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                {testCta}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};