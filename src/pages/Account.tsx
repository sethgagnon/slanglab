import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, User, LogOut, Crown, Users, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageStats } from '@/hooks/useUsageStats';
import { supabase } from '@/integrations/supabase/client';
const Account = () => {
  const { user, signOut } = useAuth();
  const usage = useUsageStats();
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
        return ['Unlimited searches', '1 creation per week', 'Advanced features'];
      case 'LabPro':
        return ['Unlimited searches', 'Unlimited creations', 'Advanced features'];
      default:
        return ['3 searches per day', '1 creation per week'];
    }
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
              {usage.plan === 'Free' && <Button 
                  className="w-full"
                  onClick={() => handleUpgrade('price_1S8uzhDt8zpU0lE0erSCXXc1')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to SearchPro
                </Button>}
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Stats</CardTitle>
              <CardDescription>Your current limits and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Searches (Daily)</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.searchesUsed} / {usage.searchesLimit === -1 ? '∞' : usage.searchesLimit}
                  </span>
                </div>
                <Progress value={usage.searchesLimit === -1 ? 0 : usage.searchesUsed / usage.searchesLimit * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Creations (Weekly)</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.creationsUsed} / {usage.creationsLimit === -1 ? '∞' : usage.creationsLimit}
                  </span>
                </div>
                <Progress value={usage.creationsLimit === -1 ? 0 : usage.creationsUsed / usage.creationsLimit * 100} className="h-2" />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Search limits reset daily at midnight UTC</p>
                <p>• Creation limits reset weekly on Monday</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          {(usage.plan === 'SearchPro' || usage.plan === 'LabPro') && <Card className="md:col-span-2">
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
          {usage.plan === 'Free' && <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Upgrade Your Experience</CardTitle>
                <CardDescription>Unlock unlimited usage and advanced features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">SearchPro</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="w-3 h-3 mr-1" />SearchPro
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$3<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Unlimited searches</li>
                        <li>• 1 creation per week</li>
                        <li>• Advanced features</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleUpgrade('price_1S8uzhDt8zpU0lE0erSCXXc1')}
                    >
                      Upgrade to SearchPro
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">LabPro</h3>
                      <Badge className="bg-primary text-primary-foreground">
                        <Users className="w-3 h-3 mr-1" />LabPro
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-2xl font-bold">$5<span className="text-sm font-normal">/month</span></p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Unlimited searches</li>
                        <li>• Unlimited creations</li>
                        <li>• Advanced features</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleUpgrade('price_1S8uztDt8zpU0lE0z8emJyw3')}
                    >
                      Upgrade to LabPro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>}
        </div>
      </div>
    </div>;
};
export default Account;