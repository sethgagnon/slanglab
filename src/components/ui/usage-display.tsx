import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UsageDisplayProps {
  searchesUsed: number;
  searchesLimit: number;
  creationsUsed?: number;
  creationsLimit?: number;
  plan: string;
  className?: string;
}

export const UsageDisplay: React.FC<UsageDisplayProps> = ({
  searchesUsed,
  searchesLimit,
  creationsUsed = 0,
  creationsLimit = 0,
  plan,
  className = ""
}) => {
  const searchPercentage = searchesLimit === -1 ? 0 : (searchesUsed / searchesLimit) * 100;
  const creationPercentage = creationsLimit === -1 ? 0 : (creationsUsed / creationsLimit) * 100;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Usage Limits</h3>
          <Badge variant="outline">{plan}</Badge>
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
          
          {creationsLimit > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Creations (Weekly)</span>
                <span className="text-sm text-muted-foreground">
                  {creationsUsed} / {creationsLimit === -1 ? '∞' : creationsLimit}
                </span>
              </div>
              <Progress 
                value={creationPercentage} 
                className="h-2"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};