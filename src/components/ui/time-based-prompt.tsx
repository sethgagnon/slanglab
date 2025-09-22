import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, Zap, Gift, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTimeBasedOffers, getTimeBasedPricing, shouldShowTimeBasedPrompt } from '@/lib/timeBasedOffers';

interface TimeBasedPromptProps {
  plan: string;
  className?: string;
  variant?: 'card' | 'banner' | 'minimal';
}

export const TimeBasedPrompt: React.FC<TimeBasedPromptProps> = ({
  plan,
  className = "",
  variant = 'banner'
}) => {
  // Don't show for paid plans
  if (plan !== 'Free') return null;
  
  // Check if we should show time-based prompts
  if (!shouldShowTimeBasedPrompt()) return null;

  const offers = getTimeBasedOffers();
  const activeOffer = offers[0]; // Get the most relevant offer
  
  if (!activeOffer) return null;

  const basePrice = 1.99; // SearchPro base price
  const pricing = getTimeBasedPricing(basePrice);

  const getOfferIcon = () => {
    switch (activeOffer.type) {
      case 'weekend_boost':
        return Calendar;
      case 'week_end_rush':
        return TrendingUp;
      case 'monday_fresh_start':
        return Zap;
      case 'limit_reset_reminder':
        return Clock;
      default:
        return Gift;
    }
  };

  const getUrgencyColor = () => {
    switch (activeOffer.urgency) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'low':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const IconComponent = getOfferIcon();
  const timeLeft = Math.ceil((activeOffer.validUntil.getTime() - Date.now()) / (1000 * 60 * 60));

  if (variant === 'minimal') {
    return (
      <div className={`${className} flex items-center gap-2 p-2 border rounded-lg ${getUrgencyColor()}`}>
        <IconComponent className="w-4 h-4" />
        <span className="text-sm font-medium flex-1">{activeOffer.title}</span>
        {pricing.discount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {pricing.discount}% OFF
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <Alert className={`${className} ${getUrgencyColor()}`}>
        <div className="flex items-center gap-3">
          <IconComponent className="h-5 w-5" />
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">{activeOffer.title}</h4>
            <AlertDescription className="text-xs mt-1">
              {activeOffer.description}
            </AlertDescription>
            
            {activeOffer.specialOffer && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {activeOffer.specialOffer}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">
              {timeLeft > 0 ? `${timeLeft}h left` : 'Ending soon'}
            </div>
            
            <div className="flex items-center gap-2">
              {pricing.discount > 0 && (
                <span className="text-xs line-through text-muted-foreground">
                  ${basePrice}/mo
                </span>
              )}
              <span className="text-sm font-medium">
                ${pricing.price.toFixed(2)}/mo
              </span>
            </div>
            
            <Button asChild size="sm" className="mt-2">
              <Link to="/account?tab=usage">
                {pricing.discount > 0 ? 'Get Deal' : 'Upgrade'}
              </Link>
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Card variant
  return (
    <Card className={`${className} border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{activeOffer.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {activeOffer.description}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-xs">
              {timeLeft > 0 ? `${timeLeft}h left` : 'Ending soon'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {activeOffer.specialOffer && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <Gift className="w-4 h-4 inline mr-2 text-primary" />
              <span className="text-sm font-medium">{activeOffer.specialOffer}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pricing.discount > 0 && (
                <span className="text-lg line-through text-muted-foreground">
                  ${basePrice}
                </span>
              )}
              <span className="text-xl font-bold">
                ${pricing.price.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            
            <Button asChild size="lg">
              <Link to="/account?tab=usage">
                <Zap className="w-4 h-4 mr-2" />
                {pricing.discount > 0 ? `Save ${pricing.discount}%` : 'Upgrade Now'}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};