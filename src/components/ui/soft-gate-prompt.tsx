import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Users, Clock, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SoftGatePromptProps {
  type: 'search-warning' | 'ai-creation-warning' | 'manual-creation-warning';
  remaining: number;
  plan: string;
  className?: string;
}

export const SoftGatePrompt: React.FC<SoftGatePromptProps> = ({
  type,
  remaining,
  plan,
  className = ""
}) => {
  // Only show soft gates when user has 1-2 uses remaining
  if (remaining > 2 || remaining <= 0) return null;

  const getContent = () => {
    switch (type) {
      case 'search-warning':
        return {
          title: remaining === 1 ? 'Last search today!' : `${remaining} searches left today`,
          description: 'After this, upgrade for unlimited searches and creation features',
          icon: Clock,
          urgency: 'high',
          benefits: ['Unlimited daily searches', '3 AI creations/week', 'Priority support'],
          social: '2,000+ creators upgraded',
          cta: 'Upgrade for $1.99/mo',
          priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL'
        };
      
      case 'ai-creation-warning':
        return {
          title: remaining === 1 ? 'Last AI creation this week!' : `${remaining} AI creations left`,
          description: plan === 'Free' ? 'Keep the creativity flowing with SearchPro or LabPro' : 'Need more? Try LabPro for daily AI creations',
          icon: Zap,
          urgency: 'medium',
          benefits: plan === 'Free' 
            ? ['3 AI creations/week', 'Unlimited searches', '5 manual/week']
            : ['2 AI creations/day', 'Unlimited manual', 'Advanced tracking'],
          social: plan === 'Free' ? 'Most popular upgrade' : 'Power user favorite',
          cta: plan === 'Free' ? 'Get SearchPro - $1.99/mo' : 'Upgrade to LabPro - $3.99/mo',
          priceId: plan === 'Free' ? 'price_1SADlGDt8zpU0lE0mlv6nVLL' : 'price_1SADmrDt8zpU0lE0PKZLjhJA'
        };
      
      case 'manual-creation-warning':
        return {
          title: remaining === 1 ? 'Last manual creation this week!' : `${remaining} manual creations left`,
          description: 'Unlock unlimited manual creations with LabPro',
          icon: TrendingUp,
          urgency: 'low',
          benefits: ['Unlimited manual creations', 'Advanced tracking', '2 AI creations/day'],
          social: 'Creators love unlimited mode',
          cta: 'Get LabPro - $3.99/mo',
          priceId: 'price_1SADmrDt8zpU0lE0PKZLjhJA'
        };
      
      default:
        return {
          title: 'Running low!',
          description: 'Upgrade for unlimited access',
          icon: Clock,
          urgency: 'medium',
          benefits: ['Unlimited access'],
          social: 'Popular choice',
          cta: 'Upgrade',
          priceId: 'price_1SADlGDt8zpU0lE0mlv6nVLL'
        };
    }
  };

  const content = getContent();
  const IconComponent = content.icon;
  const urgencyColor = content.urgency === 'high' ? 'border-orange-200 bg-orange-50' : 
                      content.urgency === 'medium' ? 'border-yellow-200 bg-yellow-50' : 
                      'border-blue-200 bg-blue-50';

  return (
    <Alert className={`${className} ${urgencyColor}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/80">
          <IconComponent className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-medium text-sm">{content.title}</h4>
            <AlertDescription className="text-xs mt-1">
              {content.description}
            </AlertDescription>
          </div>
          
          {/* Quick benefits preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {content.social}
              </Badge>
            </div>
            
            <ul className="text-xs text-muted-foreground space-y-1">
              {content.benefits.slice(0, 2).map((benefit, index) => (
                <li key={index} className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-primary rounded-full" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="default" className="text-xs">
              <Link to="/account?tab=usage">
                {type === 'search-warning' ? <Crown className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                {content.cta}
              </Link>
            </Button>
            
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Continue with limit
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
};