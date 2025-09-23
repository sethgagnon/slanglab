import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users, Zap, TrendingUp, Star, BarChart3 } from 'lucide-react';
import { PLAN_CONFIGS, FREE_PLAN_CONFIG, calculateSavings } from '@/lib/upgradeFlow';
import { StreamlinedCheckout } from '@/components/ui/streamlined-checkout';

interface EnhancedPlanComparisonProps {
  currentPlan: string;
  showCheckout?: boolean;
  source?: string;
  className?: string;
}

export const EnhancedPlanComparison: React.FC<EnhancedPlanComparisonProps> = ({
  currentPlan,
  showCheckout = false,
  source = 'plan_comparison',
  className = ""
}) => {
  const [selectedPlan, setSelectedPlan] = React.useState<'SearchPro' | 'LabPro' | null>(null);

  const features = [
    {
      category: 'Search & Discovery',
      items: [
        { name: 'Daily searches', free: '1', searchpro: 'Unlimited', labpro: 'Unlimited' },
        { name: 'Search history', free: '✓', searchpro: '✓', labpro: '✓' },
        { name: 'Advanced filters', free: '✗', searchpro: '✓', labpro: '✓' },
      ]
    },
    {
      category: 'Content Creation',
      items: [
        { name: 'AI creations', free: '1/week', searchpro: '3/week', labpro: '2/day' },
        { name: 'Manual creations', free: '3/week', searchpro: '5/week', labpro: 'Unlimited' },
        { name: 'Creation templates', free: '✗', searchpro: '✓', labpro: '✓' },
      ]
    },
    {
      category: 'Tracking & Analytics',
      items: [
        { name: 'Basic tracking', free: '✗', searchpro: '✗', labpro: '✓' },
        { name: 'Viral score tracking', free: '✗', searchpro: '✗', labpro: '✓' },
        { name: 'Platform monitoring', free: '✗', searchpro: '✗', labpro: '✓' },
        { name: 'Weekly reports', free: '✗', searchpro: '✗', labpro: '✓' },
        { name: 'Custom alerts', free: '✗', searchpro: '✗', labpro: '✓' },
      ]
    },
    {
      category: 'Support & Priority',
      items: [
        { name: 'Email support', free: 'Basic', searchpro: 'Priority', labpro: 'Priority' },
        { name: 'Feature requests', free: '✗', searchpro: '✓', labpro: '✓' },
        { name: 'Early access', free: '✗', searchpro: '✗', labpro: '✓' },
      ]
    }
  ];

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'SearchPro':
        return Crown;
      case 'LabPro':
        return Users;
      default:
        return Zap;
    }
  };

  const getFeatureValue = (item: any, plan: string) => {
    switch (plan) {
      case 'Free':
        return item.free;
      case 'SearchPro':
        return item.searchpro;
      case 'LabPro':
        return item.labpro;
      default:
        return '✗';
    }
  };

  const isFeatureIncluded = (value: string) => {
    return value !== '✗' && value !== 'Basic';
  };

  const isFeatureBest = (item: any, plan: string) => {
    const values = [item.free, item.searchpro, item.labpro];
    const current = getFeatureValue(item, plan);
    
    if (current === 'Unlimited' || current === '2/day') return true;
    if (current === 'Priority' && values.includes('Basic')) return true;
    
    return false;
  };

  if (showCheckout && selectedPlan) {
    return (
      <div className={className}>
        <StreamlinedCheckout
          plan={selectedPlan}
          source={source}
          onCancel={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Plan Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Free Plan */}
        <Card className={`relative ${currentPlan === 'Free' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Free
              </CardTitle>
              {currentPlan === 'Free' && (
                <Badge variant="secondary">Current</Badge>
              )}
            </div>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-sm text-muted-foreground">
              Perfect for getting started
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                1 search per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                1 AI creation per week
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                3 manual creations per week
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* SearchPro Plan */}
        <Card className={`relative ${currentPlan === 'SearchPro' ? 'ring-2 ring-primary' : 'ring-2 ring-blue-200'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-blue-600" />
                SearchPro
              </CardTitle>
              <div className="flex gap-1">
                {currentPlan === 'SearchPro' && (
                  <Badge variant="secondary">Current</Badge>
                )}
                <Badge className="bg-blue-600 text-white">Popular</Badge>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">${PLAN_CONFIGS.SearchPro.monthlyPrice}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlimited searches + AI creation boost
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <strong>Unlimited daily searches</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                3 AI creations per week
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                5 manual creations per week
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Priority support
              </li>
            </ul>
            
            {currentPlan !== 'SearchPro' && (
              <Button 
                className="w-full" 
                onClick={() => showCheckout ? setSelectedPlan('SearchPro') : null}
              >
                <Crown className="w-4 h-4 mr-2" />
                Choose SearchPro
              </Button>
            )}
          </CardContent>
        </Card>

        {/* LabPro Plan */}
        <Card className={`relative ${currentPlan === 'LabPro' ? 'ring-2 ring-primary' : 'ring-2 ring-purple-200'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                LabPro
              </CardTitle>
              <div className="flex gap-1">
                {currentPlan === 'LabPro' && (
                  <Badge variant="secondary">Current</Badge>
                )}
                <Badge className="bg-purple-600 text-white">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">${PLAN_CONFIGS.LabPro.monthlyPrice}</span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlimited everything + advanced tracking
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <strong>Unlimited searches & manual creations</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <strong>2 AI creations per day</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <BarChart3 className="w-3 h-3" />
                Advanced tracking & analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Weekly digest reports
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Early access to features
              </li>
            </ul>
            
            {currentPlan !== 'LabPro' && (
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={() => showCheckout ? setSelectedPlan('LabPro') : null}
              >
                <Users className="w-4 h-4 mr-2" />
                Choose LabPro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Free</th>
                  <th className="text-center py-3 px-4">SearchPro</th>
                  <th className="text-center py-3 px-4">LabPro</th>
                </tr>
              </thead>
              <tbody>
                {features.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="bg-muted/30">
                      <td colSpan={4} className="py-2 px-4 font-medium text-sm">
                        {category.category}
                      </td>
                    </tr>
                    {category.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4 text-sm">{item.name}</td>
                        <td className="text-center py-3 px-4 text-sm">
                          {isFeatureIncluded(item.free) ? (
                            <span className={isFeatureBest(item, 'Free') ? 'font-semibold text-green-600' : ''}>
                              {item.free}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{item.free}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 text-sm">
                          {isFeatureIncluded(item.searchpro) ? (
                            <span className={isFeatureBest(item, 'SearchPro') ? 'font-semibold text-blue-600' : ''}>
                              {item.searchpro}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{item.searchpro}</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 text-sm">
                          {isFeatureIncluded(item.labpro) ? (
                            <span className={isFeatureBest(item, 'LabPro') ? 'font-semibold text-purple-600' : ''}>
                              {item.labpro}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{item.labpro}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Value Proposition */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold">SearchPro is perfect if you:</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-blue-600" />
                Search frequently throughout the day
              </li>
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-blue-600" />
                Want more AI creation opportunities
              </li>
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-blue-600" />
                Need unlimited search access
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold">LabPro is perfect if you:</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-purple-600" />
                Create content daily for social media
              </li>
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-purple-600" />
                Want to track your slang's viral spread
              </li>
              <li className="flex items-center gap-2">
                <Star className="w-3 h-3 text-purple-600" />
                Need unlimited creation capabilities
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};