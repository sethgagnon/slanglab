import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  User,
  LogOut,
  Crown,
  Users,
  Download,
  Eye,
  EyeOff,
  Zap,
  CreditCard,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageStats } from '@/hooks/useUsageStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Account = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const { user, signOut } = useAuth();
  const usageStats = useUsageStats();
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan: string;
    subscription_end: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const currentPlan = subscriptionData?.plan || usageStats.plan;

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'SearchPro':
        return <Badge className="bg-primary text-primary-foreground"><Zap className="w-3 h-3 mr-1" />SearchPro</Badge>;
      case 'LabPro':
        return <Badge className="bg-primary text-primary-foreground"><Crown className="w-3 h-3 mr-1" />LabPro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'SearchPro':
        return [
          'Unlimited searches',
          'No slang creation',
          'Basic support'
        ];
      case 'LabPro':
        return [
          'Unlimited searches', 
          '25 slang creations per month',
          'Priority support',
          'Advanced features'
        ];
      default:
        return [
          '3 searches per day',
          'No slang creation',
          'Community support'
        ];
    }
  };

  return (
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
            <Link to="/history" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              History
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your plan, usage, and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
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

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Your subscription details
                    {subscriptionData?.subscription_end && (
                      <div className="mt-1 text-xs">
                        {subscriptionData.subscribed ? 'Renews' : 'Expires'} on{' '}
                        {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                      </div>
                    )}
                  </CardDescription>
                </div>
                {getPlanBadge(currentPlan)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Features included:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {getPlanFeatures(currentPlan).map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
              
              {subscriptionData?.subscribed ? (
                <div className="space-y-2">
                  <Button 
                    onClick={handleManageSubscription}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              ) : currentPlan === 'Free' && (
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => handleUpgrade('price_1S8uzhDt8zpU0lE0erSCXXc1')}
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to SearchPro - $3/mo
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleUpgrade('price_1S8uztDt8zpU0lE0z8emJyw3')}
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to LabPro - $5/mo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Today</CardTitle>
              <CardDescription>Your daily limits and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Searches</span>
                  <span className="text-sm text-muted-foreground">
                    {usageStats.searchesUsed} / {usageStats.searchesLimit === -1 ? '∞' : usageStats.searchesLimit}
                  </span>
                </div>
                <Progress 
                  value={usageStats.searchesLimit === -1 ? 0 : (usageStats.searchesUsed / usageStats.searchesLimit) * 100} 
                  className="h-2"
                />
              </div>
              
              {(usageStats.plan === 'LabPro' || usageStats.creationsLimit > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Slang Creations</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.creationsUsed} / {usageStats.creationsLimit === -1 ? '∞' : usageStats.creationsLimit}
                    </span>
                  </div>
                  <Progress 
                    value={usageStats.creationsLimit === -1 ? 0 : (usageStats.creationsUsed / usageStats.creationsLimit) * 100} 
                    className="h-2"
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Search limits reset daily at midnight UTC. Creation limits reset monthly.
              </p>
            </CardContent>
          </Card>

          {/* API Access */}
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>For developers and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">API Key</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm p-2 bg-muted rounded border font-mono">
                    {showApiKey ? 'sk-...' + user.id?.slice(-8) : '••••••••••••••••'}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this key to access the SlangLab API programmatically
                </p>
              </div>
              
              {usageStats.plan === 'Free' && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    API access is limited on the free plan. Upgrade for higher rate limits.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Export */}
          {(usageStats.plan === 'SearchPro' || usageStats.plan === 'LabPro') && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
                <CardDescription>Download your data</CardDescription>
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

          {/* Plan Upgrade */}
          {!subscriptionData?.subscribed && currentPlan === 'Free' && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Upgrade Your Experience</CardTitle>
                <CardDescription>Choose the plan that fits your needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">SearchPro</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Zap className="w-3 h-3 mr-1" />SearchPro
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$3<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Unlimited searches</li>
                        <li>• Fast lookups</li>
                        <li>• Basic support</li>
                        <li>• No slang creation</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleUpgrade('price_1S8uzhDt8zpU0lE0erSCXXc1')}
                      disabled={isLoading}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to SearchPro
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">LabPro</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="w-3 h-3 mr-1" />LabPro
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$5<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Unlimited searches</li>
                        <li>• 25 slang creations/month</li>
                        <li>• Priority support</li>
                        <li>• Advanced features</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleUpgrade('price_1S8uztDt8zpU0lE0z8emJyw3')}
                      disabled={isLoading}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to LabPro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;