import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Crown, Users, Zap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createUpgradeFlow, PLAN_CONFIGS } from '@/lib/upgradeFlow';

interface StreamlinedCheckoutProps {
  plan: 'SearchPro' | 'LabPro';
  source: string;
  context?: string;
  isFromTrial?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
}

export const StreamlinedCheckout: React.FC<StreamlinedCheckoutProps> = ({
  plan,
  source,
  context,
  isFromTrial = false,
  onSuccess,
  onCancel,
  className = "",
  variant = 'full'
}) => {
  const [loading, setLoading] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const { toast } = useToast();

  const upgradeFlow = createUpgradeFlow({ plan, source, context, isFromTrial });
  const planConfig = PLAN_CONFIGS[plan];

  const handleUpgrade = async (useAnnual: boolean = false) => {
    setLoading(true);
    upgradeFlow.trackEvent();

    try {
      const priceId = useAnnual ? `${planConfig.priceId}_annual` : planConfig.priceId;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId,
          source,
          context,
          isFromTrial
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        upgradeFlow.trackSuccess();
        window.open(data.url, '_blank');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Upgrade failed",
        description: error.message || "Unable to start upgrade process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={`${className} flex items-center gap-2`}>
        <Button 
          onClick={() => handleUpgrade(false)}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <CreditCard className="w-3 h-3 mr-1" />
          )}
          ${planConfig.monthlyPrice}/mo
        </Button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={`${className} border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {plan === 'LabPro' ? <Users className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                {planConfig.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {planConfig.popularFeatures.join(' • ')}
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">
                  ${planConfig.monthlyPrice}/mo
                </span>
                {isFromTrial && (
                  <Badge variant="secondary" className="text-xs">
                    Trial ending
                  </Badge>
                )}
              </div>
              
              <Button 
                onClick={() => handleUpgrade(false)}
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <>
                    <CreditCard className="w-3 h-3 mr-1" />
                    Upgrade Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card className={`${className} border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {plan === 'LabPro' ? <Users className="w-5 h-5 text-primary" /> : <Crown className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-xl">{planConfig.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isFromTrial ? 'Continue with full access' : 'Upgrade for unlimited features'}
              </p>
            </div>
          </div>
          
          {isFromTrial && (
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
              Trial ending soon
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Features */}
        <div className="grid gap-2">
          {planConfig.popularFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>

        {/* Pricing Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
            <div>
              <div className="font-medium">Monthly</div>
              <div className="text-sm text-muted-foreground">Cancel anytime</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">${planConfig.monthlyPrice}/mo</div>
              <Button 
                onClick={() => handleUpgrade(false)}
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <CreditCard className="w-3 h-3 mr-1" />
                )}
                Start Monthly
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
            <div>
              <div className="font-medium flex items-center gap-2">
                Annual
                <Badge variant="secondary" className="text-xs">
                  Save 17%
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Best value</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">${planConfig.annualPrice}/year</div>
              <div className="text-xs text-muted-foreground mb-1">
                ${(planConfig.annualPrice / 12).toFixed(2)}/mo
              </div>
              <Button 
                onClick={() => handleUpgrade(true)}
                disabled={loading}
                size="sm"
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <CreditCard className="w-3 h-3 mr-1" />
                )}
                Start Annual
              </Button>
            </div>
          </div>
        </div>

        {/* Security & Guarantee */}
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>30-day money-back guarantee.</strong> Secure checkout with Stripe. Cancel anytime.
          </AlertDescription>
        </Alert>

        {/* Cancel Option */}
        {onCancel && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Maybe later
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};