import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, User, LogOut, Crown, Users, Download, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
interface UsageStats {
  lookupsUsed: number;
  lookupsLimit: number;
  generationsUsed: number;
  generationsLimit: number;
  plan: 'free' | 'plus' | 'team';
}
const Account = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [usage, setUsage] = useState<UsageStats>({
    lookupsUsed: 2,
    lookupsLimit: 5,
    generationsUsed: 1,
    generationsLimit: 3,
    plan: 'free'
  });
  const {
    user,
    signOut
  } = useAuth();
  useEffect(() => {
    if (user) {
      // TODO: Load actual usage stats from API
    }
  }, [user]);
  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
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
      </div>;
  }
  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'plus':
        return <Badge className="bg-primary text-primary-foreground"><Crown className="w-3 h-3 mr-1" />Plus</Badge>;
      case 'team':
        return <Badge className="bg-primary text-primary-foreground"><Users className="w-3 h-3 mr-1" />Team</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };
  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'plus':
        return ['Unlimited lookups', 'Unlimited generations', 'Favorites export (CSV)', 'Parent Mode', 'Share cards with OG images'];
      case 'team':
        return ['Everything in Plus', '5 team seats', 'Shared collections', 'Moderation view', 'Advanced exports'];
      default:
        return ['5 lookups per day', '3 generations per day', 'Basic features only'];
    }
  };
  return <div className="min-h-screen bg-background">
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
                  <CardDescription>Your subscription details</CardDescription>
                </div>
                {getPlanBadge(usage.plan)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Features included:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {getPlanFeatures(usage.plan).map((feature, index) => <li key={index}>• {feature}</li>)}
                </ul>
              </div>
              {usage.plan === 'free' && <Button className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Plus
                </Button>}
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
                  <span className="text-sm font-medium">Lookups</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.lookupsUsed} / {usage.lookupsLimit === -1 ? '∞' : usage.lookupsLimit}
                  </span>
                </div>
                <Progress value={usage.lookupsLimit === -1 ? 0 : usage.lookupsUsed / usage.lookupsLimit * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Generations</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.generationsUsed} / {usage.generationsLimit === -1 ? '∞' : usage.generationsLimit}
                  </span>
                </div>
                <Progress value={usage.generationsLimit === -1 ? 0 : usage.generationsUsed / usage.generationsLimit * 100} className="h-2" />
              </div>

              <p className="text-xs text-muted-foreground">
                Limits reset daily at midnight UTC
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
                  <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this key to access the SlangLab API programmatically
                </p>
              </div>
              
              {usage.plan === 'free' && <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    API access is limited on the free plan. Upgrade for higher rate limits.
                  </p>
                </div>}
            </CardContent>
          </Card>

          {/* Data Export */}
          {(usage.plan === 'plus' || usage.plan === 'team') && <Card className="md:col-span-2">
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
            </Card>}

          {/* Plan Upgrade */}
          {usage.plan === 'free' && <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Upgrade Your Experience</CardTitle>
                <CardDescription>Unlock unlimited usage and advanced features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Plus Plan</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="w-3 h-3 mr-1" />Plus
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$7<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Unlimited lookups & generations</li>
                        <li>• CSV exports</li>
                        <li>• Share cards with OG images</li>
                        <li>• Parent Mode</li>
                      </ul>
                    </div>
                    <Button className="w-full">Upgrade to Plus</Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Team Plan</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Users className="w-3 h-3 mr-1" />Team
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$29<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Everything in Plus</li>
                        <li>• 5 team seats</li>
                        <li>• Shared collections</li>
                        
                      </ul>
                    </div>
                    <Button className="w-full" variant="outline">Upgrade to Team</Button>
                  </div>
                </div>
              </CardContent>
            </Card>}
        </div>
      </div>
    </div>;
};
export default Account;