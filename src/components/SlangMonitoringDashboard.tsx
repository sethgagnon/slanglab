import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlangMonitoring } from '@/hooks/useSlangMonitoring';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Eye, Search, Zap, RefreshCw } from 'lucide-react';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'trending':
      return <TrendingUp className="h-4 w-4" />;
    case 'spotted':
      return <Eye className="h-4 w-4" />;
    case 'monitoring':
      return <Search className="h-4 w-4" />;
    case 'dormant':
      return <Zap className="h-4 w-4 opacity-50" />;
    default:
      return <Search className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'trending':
      return 'destructive';
    case 'spotted':
      return 'default';
    case 'monitoring':
      return 'secondary';
    case 'dormant':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'trending':
      return '🔥 Trending';
    case 'spotted':
      return '👀 Spotted';
    case 'monitoring':
      return '🔍 Monitoring';
    case 'dormant':
      return '💤 Dormant';
    default:
      return status;
  }
};

export const SlangMonitoringDashboard: React.FC = () => {
  const { monitoringData, loading, triggerManualCheck } = useSlangMonitoring();
  const { toast } = useToast();
  const [checking, setChecking] = React.useState(false);

  const handleManualCheck = async () => {
    setChecking(true);
    const result = await triggerManualCheck();
    
    if (result.success) {
      toast({
        title: "Check Started",
        description: "We're scanning the web for your slang. Results will update automatically.",
      });
    } else {
      toast({
        title: "Check Failed",
        description: result.error || "Failed to start monitoring check",
        variant: "destructive",
      });
    }
    
    setChecking(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (monitoringData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Slang Being Tracked</h3>
          <p className="text-muted-foreground">
            Share your slang creations to start monitoring if they become trending in the wild!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Slang in the Wild</h2>
        <Button 
          onClick={handleManualCheck} 
          disabled={checking}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Check Now
        </Button>
      </div>

      <div className="grid gap-4">
        {monitoringData.map((item) => (
          <Card key={item.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{item.creations.phrase}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {item.creations.meaning}
                  </p>
                </div>
                <Badge variant={getStatusColor(item.status)} className="flex items-center gap-1">
                  {getStatusIcon(item.status)}
                  {getStatusText(item.status)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Times Found</div>
                  <div className="text-lg font-bold">{item.times_found}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Trending Score</div>
                  <div className="text-lg font-bold">{item.trending_score}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Platforms</div>
                  <div className="text-lg font-bold">{item.platforms_detected.length}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Last Found</div>
                  <div className="text-sm">
                    {item.last_found_at 
                      ? new Date(item.last_found_at).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>
              </div>

              {item.platforms_detected.length > 0 && (
                <div>
                  <div className="font-medium text-muted-foreground mb-2">Detected On:</div>
                  <div className="flex flex-wrap gap-1">
                    {item.platforms_detected.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Monitoring since {new Date(item.monitoring_started_at).toLocaleDateString()}
                {item.last_checked_at && (
                  <> • Last checked {new Date(item.last_checked_at).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>

            {item.status === 'trending' && (
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-b-[40px] border-b-destructive">
                <TrendingUp className="absolute -bottom-7 -right-7 h-4 w-4 text-white" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};