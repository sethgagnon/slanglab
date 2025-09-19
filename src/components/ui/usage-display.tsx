import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UsageDisplayProps {
  searchesUsed: number;
  searchesLimit: number;
  aiCreationsUsed?: number;
  aiCreationsLimit?: number;
  manualCreationsUsed?: number;
  manualCreationsLimit?: number;
  plan: string;
  className?: string;
  isAdmin?: boolean;
}

export const UsageDisplay: React.FC<UsageDisplayProps> = ({
  searchesUsed,
  searchesLimit,
  aiCreationsUsed = 0,
  aiCreationsLimit = 0,
  manualCreationsUsed = 0,
  manualCreationsLimit = 0,
  plan,
  className = "",
  isAdmin = false
}) => {
  const searchPercentage = searchesLimit === -1 ? 0 : (searchesUsed / searchesLimit) * 100;
  const aiCreationPercentage = aiCreationsLimit === -1 ? 0 : (aiCreationsUsed / aiCreationsLimit) * 100;
  const manualCreationPercentage = manualCreationsLimit === -1 ? 0 : (manualCreationsUsed / manualCreationsLimit) * 100;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Usage Limits</h3>
          <Badge variant={isAdmin ? "default" : "outline"}>{plan}</Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Searches</span>
              <span className="text-sm text-muted-foreground">
                {searchesUsed} / {searchesLimit === -1 ? '∞' : searchesLimit}
              </span>
            </div>
            <Progress 
              value={searchPercentage} 
              className="h-2"
            />
          </div>
          
          {aiCreationsLimit > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">AI Creations {plan === 'LabPro' ? '(Daily)' : '(Weekly)'}</span>
                <span className="text-sm text-muted-foreground">
                  {aiCreationsUsed} / {aiCreationsLimit === -1 ? '∞' : aiCreationsLimit}
                </span>
              </div>
              <Progress 
                value={aiCreationPercentage} 
                className="h-2"
              />
            </div>
          )}
          
          {manualCreationsLimit > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Manual Creations (Weekly)</span>
                <span className="text-sm text-muted-foreground">
                  {manualCreationsUsed} / {manualCreationsLimit === -1 ? '∞' : manualCreationsLimit}
                </span>
              </div>
              <Progress 
                value={manualCreationPercentage} 
                className="h-2"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};