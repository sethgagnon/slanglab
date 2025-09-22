import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOHead, createWebsiteSchema } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Sparkles, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Eye, 
  Share2,
  Zap,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreationsWithTracking } from '@/hooks/useCreationsWithTracking';
import { useTracking } from '@/hooks/useTracking';
import { ShareTrackModal } from '@/components/ShareTrackModal';
import { ProtectedFeature } from '@/components/ProtectedFeature';
import { formatDistanceToNow } from 'date-fns';

const AccountCreations = () => {
  const navigate = useNavigate();
  const { user, hasLabProAccess } = useAuth();
  const { creations, loading } = useCreationsWithTracking();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCreation, setSelectedCreation] = useState<any>(null);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleShare = (creation: any) => {
    setSelectedCreation(creation);
    setShareModalOpen(true);
  };

  const formatLastRun = (lastRunAt?: string) => {
    if (!lastRunAt) return 'Never';
    return formatDistanceToNow(new Date(lastRunAt), { addSuffix: true });
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const CreationRow = ({ creation }: { creation: any }) => {
    const { isTracking, toggleTracking, loading: trackingLoading, canTrack } = useTracking({
      creation,
      hasLabProAccess
    });

    return (
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span>{creation.phrase}</span>
              <Badge 
                variant={creation.creation_type === 'ai' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {creation.creation_type === 'ai' ? (
                  <>
                    <Zap className="w-2 h-2 mr-1" />
                    AI
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-2 h-2 mr-1" />
                    Manual
                  </>
                )}
              </Badge>
            </div>
          </div>
        </TableCell>
        
        <TableCell className="max-w-xs">
          <p className="text-sm text-muted-foreground truncate" title={creation.example}>
            {creation.example}
          </p>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2">
            <Switch
              checked={isTracking}
              onCheckedChange={toggleTracking}
              disabled={trackingLoading || (!canTrack && !isTracking)}
            />
            <span className="text-sm text-muted-foreground">
              {isTracking ? 'On' : 'Off'}
            </span>
          </div>
        </TableCell>
        
        <TableCell className="text-sm text-muted-foreground">
          {formatLastRun(creation.last_run_at)}
        </TableCell>
        
        <TableCell className="text-center">
          <Badge variant="outline">
            {creation.total_spotted}
          </Badge>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2">
            {getTrendIcon(creation.trend_direction)}
            <span className="text-sm">
              {creation.spotted_7d_current}
            </span>
            {creation.trend_percentage > 0 && (
              <span className="text-xs text-muted-foreground">
                ({creation.trend_percentage.toFixed(0)}%)
              </span>
            )}
          </div>
        </TableCell>
        
        <TableCell>
          <div className="flex gap-2">
            {creation.slug && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/t/${creation.slug}`}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleShare(creation)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const LoadingSkeleton = () => (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-6 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-6 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <SEOHead
        title="My Creations with Tracking - SlangLab"
        description="Monitor your slang creations with tracking analytics, see trending data and manage your terms."
        keywords="slang tracking, creation monitoring, trending analysis, slang analytics"
        structuredData={createWebsiteSchema()}
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Link to="/" className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">SlangLab</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Creations</h1>
            <p className="text-muted-foreground">
              Track your slang creations and monitor their trending performance across platforms
            </p>
          </div>

          <ProtectedFeature 
            config={{ requiresAuth: true }}
            showCard={false}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Creations Overview
                </CardTitle>
                <CardDescription>
                  Manage tracking and view analytics for your slang terms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term</TableHead>
                          <TableHead>Example</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Last Run</TableHead>
                          <TableHead>Total Spotted</TableHead>
                          <TableHead>7-day Trend</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <LoadingSkeleton />
                      </TableBody>
                    </Table>
                  </div>
                ) : creations.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term</TableHead>
                          <TableHead>Example</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Last Run</TableHead>
                          <TableHead className="text-center">Total Spotted</TableHead>
                          <TableHead>7-day Trend</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creations.map((creation) => (
                          <CreationRow key={creation.id} creation={creation} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No creations yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start creating slang terms to see them here with tracking capabilities
                    </p>
                    <Button asChild>
                      <Link to="/slang-lab">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Your First Term
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </ProtectedFeature>
        </div>

        {/* Share Modal */}
        {selectedCreation && (
          <ShareTrackModal
            open={shareModalOpen}
            onOpenChange={setShareModalOpen}
            creation={selectedCreation}
            userId={user.id}
            hasLabProAccess={hasLabProAccess}
          />
        )}
      </div>
    </>
  );
};

export default AccountCreations;