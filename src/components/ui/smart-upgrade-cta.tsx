import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, TrendingUp, Zap, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SmartUpgradeCtaProps {
  context: 'success-creation' | 'high-usage' | 'feature-discovery' | 'social-proof';
  plan: string;
  className?: string;
}

export const SmartUpgradeCta: React.FC<SmartUpgradeCtaProps> = ({
  context,
  plan,
  className = ""
}) => {
  // Don't show for paid plans or admins
  if (plan !== 'Free') return null;

  const getContextualContent = () => {
    switch (context) {
      case 'success-creation':
        return {
          title: 'Love creating slang? 🔥',
          description: 'You just created something amazing! Unlock unlimited creativity with SearchPro.',
          highlight: '3x more AI creations per week',
          socialProof: 'Join 2,000+ creators',
          cta: 'Upgrade to SearchPro',
          price: '$1.99/mo',
          icon: Crown
        };
        
      case 'high-usage':
        return {
          title: 'You\'re on fire! 🚀',
          description: 'Power users like you love LabPro for unlimited manual creations and advanced tracking.',
          highlight: 'Unlimited everything + tracking',
          socialProof: 'Preferred by top creators',
          cta: 'Get LabPro',
          price: '$3.99/mo',
          icon: Users
        };
        
      case 'feature-discovery':
        return {
          title: 'Ready to track your viral slang? 📈',
          description: 'See how your creations spread across the internet with LabPro\'s advanced tracking.',
          highlight: 'Track slang across platforms',
          socialProof: '95% see results in 7 days',
          cta: 'Unlock Tracking',
          price: '$3.99/mo',
          icon: TrendingUp
        };
        
      case 'social-proof':
        return {
          title: 'Join the creator elite ⭐',
          description: 'Top slang creators use SearchPro for consistent viral content creation.',
          highlight: 'Used by viral creators',
          socialProof: 'Creators make 3x more viral slang',
          cta: 'Join SearchPro',
          price: '$1.99/mo',
          icon: Star
        };
        
      default:
        return {
          title: 'Upgrade your creativity',
          description: 'Unlock more features and unlimited usage.',
          highlight: 'More features available',
          socialProof: 'Loved by creators',
          cta: 'Upgrade',
          price: '$1.99/mo',
          icon: Zap
        };
    }
  };

  const content = getContextualContent();
  const IconComponent = content.icon;

  return (
    <Card className={`${className} bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{content.title}</CardTitle>
            <CardDescription className="text-sm">
              {content.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{content.highlight}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {content.socialProof}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                {content.price}
              </Badge>
              <Button size="sm" asChild>
                <Link to="/account?tab=usage">
                  {content.cta}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};