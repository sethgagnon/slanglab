import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UpgradePromptProps {
  type: 'search-limit' | 'creation-limit' | 'signup-required';
  className?: string;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  type,
  className = ""
}) => {
  const getContent = () => {
    switch (type) {
      case 'signup-required':
        return {
          title: 'Free Search Used',
          description: 'You\'ve used your 1 free search. Create an account to get 3 daily searches!',
          action: (
            <Button asChild className="w-full">
              <Link to="/auth">Create Free Account</Link>
            </Button>
          )
        };
      
      case 'search-limit':
        return {
          title: 'Daily Search Limit Reached',
          description: 'You\'ve used all 3 daily searches. Upgrade for unlimited access!',
          action: (
            <div className="space-y-3">
              <div className="grid gap-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">SearchPro</h4>
                    <Badge className="bg-primary text-primary-foreground">
                      <Zap className="w-3 h-3 mr-1" />$3/mo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Unlimited searches</p>
                  <Button className="w-full" size="sm">Upgrade to SearchPro</Button>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">LabPro</h4>
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="w-3 h-3 mr-1" />$5/mo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Unlimited searches + 25 slang creations/month</p>
                  <Button className="w-full" size="sm" variant="outline">Upgrade to LabPro</Button>
                </div>
              </div>
            </div>
          )
        };
      
      case 'creation-limit':
        return {
          title: 'Monthly Creation Limit Reached',
          description: 'You\'ve used all 25 monthly slang creations. Limits reset next month.',
          action: (
            <Button asChild className="w-full">
              <Link to="/account">View Account</Link>
            </Button>
          )
        };
      
      default:
        return { title: '', description: '', action: null };
    }
  };

  const content = getContent();

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle className="text-lg">{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {content.action}
      </CardContent>
    </Card>
  );
};