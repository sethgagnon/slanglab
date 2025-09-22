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
          description: 'You\'ve used your 1 free search. Create an account to get 1 daily search plus creation features!',
          action: (
            <Button asChild className="w-full">
              <Link to="/auth">Create Free Account</Link>
            </Button>
          )
        };
      
      case 'search-limit':
        return {
          title: 'Daily Search Limit Reached',
          description: 'You\'ve used your daily search. Upgrade for unlimited access!',
          action: (
            <div className="space-y-3">
              <div className="grid gap-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">SearchPro</h4>
                    <Badge className="bg-primary text-primary-foreground">
                      <Zap className="w-3 h-3 mr-1" />$1.99/mo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Unlimited searches + 3 AI creations/week</p>
                  <Button className="w-full" size="sm" asChild>
                    <Link to="/account">Upgrade to SearchPro</Link>
                  </Button>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">LabPro</h4>
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="w-3 h-3 mr-1" />$3.99/mo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Unlimited searches + 2 AI creations/day</p>
                  <Button className="w-full" size="sm" variant="outline" asChild>
                    <Link to="/account">Upgrade to LabPro</Link>
                  </Button>
                </div>
              </div>
            </div>
          )
        };
      
      case 'creation-limit':
        return {
          title: 'Creation Limit Reached',
          description: 'You\'ve used your creation allowance. Upgrade for more AI creations and unlimited manual creations!',
          action: (
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/account">Upgrade Your Plan</Link>
              </Button>
            </div>
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