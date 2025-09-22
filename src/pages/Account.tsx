import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SEOHead, createWebsiteSchema } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, 
  User, 
  LogOut, 
  Crown, 
  Users, 
  Download, 
  Star, 
  ArrowRight, 
  Zap, 
  PlusCircle,
  Search,
  Filter,
  StarOff,
  Clock,
  Share2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Settings,
  BarChart3,
  Trophy,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useFavorites } from '@/hooks/useFavorites';
import { useCreations } from '@/hooks/useCreations';
import { useCreationsWithTracking } from '@/hooks/useCreationsWithTracking';
import { useTracking } from '@/hooks/useTracking';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShareTrackModal } from '@/components/ShareTrackModal';
import { FeatureDisclosure } from '@/components/ui/feature-disclosure';
import { SmartSegmentationCta } from '@/components/ui/smart-segmentation-cta';
import { EnhancedPlanComparison } from '@/components/ui/enhanced-plan-comparison';
import CreatorStats from '@/components/CreatorStats';
import { formatDistanceToNow } from 'date-fns';

interface HistoryItem {
  id: string;
  term: string;
  confidence: string;
  tone: string;
  meaning: string;
  created_at: string;
  is_favorite: boolean;
}

const Account = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { user, signOut, hasLabProAccess } = useAuth();
  const usage = useUsageStats();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { creations, loading: creationsLoading, deleteCreation } = useCreations();
  const { creations: trackingCreations, loading: trackingLoading } = useCreationsWithTracking();
  const { toast } = useToast();

  // History management state
  const [searchTerm, setSearchTerm] = useState('');
  const [toneFilter, setToneFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [lookups, setLookups] = useState<HistoryItem[]>([]);
  const [historyFavorites, setHistoryFavorites] = useState<HistoryItem[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCreation, setSelectedCreation] = useState<any>(null);

  useEffect(() => {
    if (user && activeTab === 'history') {
      loadHistory();
    }
  }, [user, activeTab, searchTerm, toneFilter, dateFilter]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('user-history', {
        body: { 
          filters: {
            search: searchTerm,
            tone: toneFilter,
            dateRange: dateFilter
          },
          page: 1,
          limit: 50
        }
      });

      if (error) throw error;

      setLookups(data.lookups || []);
      setHistoryFavorites(data.favorites || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
      toast({
        title: "Load failed",
        description: error.message || "Unable to load history.",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleShare = (creation: any) => {
    setSelectedCreation(creation);
    setShareModalOpen(true);
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };

  const toggleFavorite = async (itemId: string) => {
    try {
      const item = lookups.find(l => l.id === itemId);
      if (!item) return;

      const { data: termData } = await supabase
        .from('terms')
        .select('id')
        .eq('text', item.term)
        .single();

      if (!termData) {
        throw new Error('Term not found');
      }

      const { data, error } = await supabase.functions.invoke('manage-favorites', {
        body: { 
          action: item.is_favorite ? 'remove' : 'add',
          itemId: termData.id,
          itemType: 'term'
        }
      });

      if (error) throw error;

      setLookups(prev => prev.map(lookup => 
        lookup.id === itemId 
          ? { ...lookup, is_favorite: !lookup.is_favorite }
          : lookup
      ));

      toast({
        title: "Updated",
        description: data.message || "Favorite status updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Unable to update favorite.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCreation = async (creationId: string) => {
    try {
      await deleteCreation(creationId);
      toast({
        title: "Deleted",
        description: "Creation deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Unable to delete creation.",
        variant: "destructive",
      });
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'SearchPro':
        return <Badge className="bg-primary text-primary-foreground"><Crown className="w-3 h-3 mr-1" />SearchPro</Badge>;
      case 'LabPro':
        return <Badge className="bg-primary text-primary-foreground"><Users className="w-3 h-3 mr-1" />LabPro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };
  
  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'SearchPro':
        return ['Unlimited searches', '3 AI creations per week', '5 manual creations per week', 'Priority support'];
      case 'LabPro':
        return ['Unlimited searches', '2 AI creations per day', 'Unlimited manual creations', 'Advanced tracking'];
      default:
        return ['1 search per day', '1 AI creation per week', '3 manual creations per week'];
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-confidence-high text-white';
      case 'Medium': return 'bg-confidence-medium text-white';
      case 'Low': return 'bg-confidence-low text-white';
      default: return 'bg-confidence-low text-white';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'positive': return 'border-tone-positive text-tone-positive';
      case 'neutral': return 'border-tone-neutral text-tone-neutral';
      case 'insulting': return 'border-tone-insulting text-tone-insulting';
      case 'adult': return 'border-tone-adult text-tone-adult';
      case 'niche': return 'border-tone-niche text-tone-niche';
      default: return 'border-tone-neutral text-tone-neutral';
    }
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
            {creation.total_spotted || 0}
          </Badge>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2">
            {getTrendIcon(creation.trend_direction || 'neutral')}
            <span className="text-sm">
              {creation.spotted_7d_current || 0}
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your account settings.
            </p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Account Dashboard - SlangLab"
        description="Manage your SlangLab account, view usage statistics, track creations, manage favorites, and access your complete slang journey."
        keywords="account dashboard, slang creator profile, subscription management, usage stats, creation tracking"
        structuredData={createWebsiteSchema()}
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">SlangLab</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/lookup" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Lookup
              </Link>
              <Link to="/slang-lab" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Creator
              </Link>
              <Link to="/leaderboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Leaderboard
              </Link>
            </nav>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account">
                  <User className="h-4 w-4 mr-1" />
                  Account
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Account Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your complete SlangLab experience
            </p>
          </div>

          {/* Unified Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="creations" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Creations
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Profile & Settings Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Member Since</label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(user.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Your subscription details</CardDescription>
                      </div>
                      {getPlanBadge(usage.plan)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Features included:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {getPlanFeatures(usage.plan).map((feature, index) => (
                          <li key={index}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                    {usage.plan === 'Free' && (
                      <Button 
                        className="w-full"
                        onClick={() => handleUpgrade('price_1SADlGDt8zpU0lE0mlv6nVLL')}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to SearchPro
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Usage & Plan Tab */}
            <TabsContent value="usage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                  <CardDescription>Your current limits and usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Searches (Daily)</span>
                      <span className="text-sm text-muted-foreground">
                        {usage.searchesUsed} / {usage.searchesLimit === -1 ? '∞' : usage.searchesLimit}
                      </span>
                    </div>
                    <Progress value={usage.searchesLimit === -1 ? 0 : usage.searchesUsed / usage.searchesLimit * 100} className="h-2" />
                    {usage.searchesLimit !== -1 && usage.searchesUsed >= usage.searchesLimit && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-destructive font-medium">Daily limit reached</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpgrade('price_1SADlGDt8zpU0lE0mlv6nVLL')}
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          Upgrade
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">AI Creations {usage.plan === 'LabPro' ? '(Daily)' : '(Weekly)'}</span>
                      <span className="text-sm text-muted-foreground">
                        {usage.aiCreationsUsed} / {usage.aiCreationsLimit === -1 ? '∞' : usage.aiCreationsLimit}
                      </span>
                    </div>
                    <Progress value={usage.aiCreationsLimit === -1 ? 0 : usage.aiCreationsUsed / usage.aiCreationsLimit * 100} className="h-2" />
                    {usage.aiCreationsLimit !== -1 && usage.aiCreationsUsed >= usage.aiCreationsLimit && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-destructive font-medium">Limit reached</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpgrade(usage.plan === 'SearchPro' ? 'price_1SADmrDt8zpU0lE0PKZLjhJA' : 'price_1SADlGDt8zpU0lE0mlv6nVLL')}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {usage.plan === 'SearchPro' ? 'Get LabPro' : 'Upgrade'}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Manual Creations (Weekly)</span>
                      <span className="text-sm text-muted-foreground">
                        {usage.manualCreationsUsed} / {usage.manualCreationsLimit === -1 ? '∞' : usage.manualCreationsLimit}
                      </span>
                    </div>
                    <Progress value={usage.manualCreationsLimit === -1 ? 0 : usage.manualCreationsUsed / usage.manualCreationsLimit * 100} className="h-2" />
                    {usage.manualCreationsLimit !== -1 && usage.manualCreationsUsed >= usage.manualCreationsLimit && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-destructive font-medium">Weekly limit reached</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpgrade('price_1SADmrDt8zpU0lE0PKZLjhJA')}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Get LabPro
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Search limits reset daily at midnight UTC</p>
                    <p>• Creation limits reset weekly on Monday</p>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Upgrade */}
              {usage.plan === 'Free' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Upgrade Your Experience</CardTitle>
                    <CardDescription>Unlock unlimited usage and advanced features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">SearchPro</h3>
                          <Badge>$1.99/mo</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                          <li>• Unlimited daily searches</li>
                          <li>• 3 AI creations per week</li>
                          <li>• 5 manual creations per week</li>
                          <li>• Priority support</li>
                        </ul>
                        <Button 
                          className="w-full" 
                          onClick={() => handleUpgrade('price_1SADlGDt8zpU0lE0mlv6nVLL')}
                        >
                          Choose SearchPro
                        </Button>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">LabPro</h3>
                          <Badge>$3.99/mo</Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                          <li>• Everything in SearchPro</li>
                          <li>• 2 AI creations per day</li>
                          <li>• Unlimited manual creations</li>
                          <li>• Advanced tracking & analytics</li>
                        </ul>
                         <Button 
                          className="w-full" 
                          onClick={() => handleUpgrade('price_1SADmrDt8zpU0lE0PKZLjhJA')}
                        >
                          Choose LabPro
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Smart Segmentation CTA */}
              {usage.plan === 'Free' && (
                <div className="mt-6">
                  <SmartSegmentationCta 
                    usage={usage}
                    accountAge={user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 30}
                    variant="card"
                  />
                </div>
              )}
            </TabsContent>

            {/* My Creations Tab */}
            <TabsContent value="creations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    My Creations with Tracking
                  </CardTitle>
                  <CardDescription>
                    Manage tracking and view analytics for your slang terms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trackingLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : trackingCreations.length > 0 ? (
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
                          {trackingCreations.map((creation) => (
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
                      <div className="space-y-4">
                        <Button asChild>
                          <Link to="/slang-lab">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Create Your First Term
                          </Link>
                        </Button>
                        
                        {/* Progressive feature disclosure */}
                        <div className="max-w-lg mx-auto space-y-4">
                          <FeatureDisclosure 
                            feature="tracking" 
                            plan={usage.plan} 
                            variant="inline"
                          />
                          <FeatureDisclosure 
                            feature="analytics" 
                            plan={usage.plan} 
                            variant="minimal"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites & History Tab */}
            <TabsContent value="history" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search terms or meanings..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={toneFilter} onValueChange={setToneFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All tones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tones</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="insulting">Insulting</SelectItem>
                        <SelectItem value="adult">Adult</SelectItem>
                        <SelectItem value="niche">Niche</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* History Content */}
              <Tabs defaultValue="lookups" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lookups">Recent Lookups</TabsTrigger>
                  <TabsTrigger value="favorites">Favorites</TabsTrigger>
                </TabsList>

                <TabsContent value="lookups" className="space-y-4">
                  {lookups.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No lookups found</h3>
                        <p className="text-muted-foreground mb-4">
                          Start exploring slang to build your history!
                        </p>
                        <Button asChild>
                          <Link to="/lookup">
                            <Search className="mr-2 h-4 w-4" />
                            Start Exploring
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {lookups.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold">{item.term}</h3>
                                  <Badge className={getConfidenceColor(item.confidence)}>
                                    {item.confidence}
                                  </Badge>
                                  <Badge variant="outline" className={getToneColor(item.tone)}>
                                    {item.tone}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-2">{item.meaning}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {new Date(item.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(item.id)}
                              >
                                {item.is_favorite ? (
                                  <Star className="h-4 w-4 fill-current text-primary" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="favorites" className="space-y-4">
                  {historyFavorites.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Star terms you love to see them here!
                        </p>
                        <Button asChild>
                          <Link to="/lookup">
                            <Search className="mr-2 h-4 w-4" />
                            Discover Terms
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {historyFavorites.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold">{item.term}</h3>
                                  <Badge className={getConfidenceColor(item.confidence)}>
                                    {item.confidence}
                                  </Badge>
                                  <Badge variant="outline" className={getToneColor(item.tone)}>
                                    {item.tone}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mb-2">{item.meaning}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {new Date(item.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <Star className="h-4 w-4 fill-current text-primary" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Stats & Achievements Tab */}
            <TabsContent value="stats" className="space-y-6">
              <CreatorStats />
            </TabsContent>

            {/* Data & Export Tab */}
            <TabsContent value="data" className="space-y-6">
              {(usage.plan === 'SearchPro' || usage.plan === 'LabPro') && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Export</CardTitle>
                    <CardDescription>Download your SlangLab data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Button variant="outline" className="h-20 flex-col">
                        <Download className="h-6 w-6 mb-2" />
                        <span className="text-sm">Favorites CSV</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <Download className="h-6 w-6 mb-2" />
                        <span className="text-sm">History CSV</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <Download className="h-6 w-6 mb-2" />
                        <span className="text-sm">All Data</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Account Management</CardTitle>
                  <CardDescription>Manage your account settings and data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Download All Data</h4>
                      <p className="text-sm text-muted-foreground">Export all your SlangLab data</p>
                    </div>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Account Security</h4>
                      <p className="text-sm text-muted-foreground">Manage password and security settings</p>
                    </div>
                    <Button variant="outline">
                      <Shield className="w-4 h-4 mr-2" />
                      Security
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

export default Account;