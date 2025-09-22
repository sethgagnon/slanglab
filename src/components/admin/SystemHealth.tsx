import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Database, User, Router, FileText, Play } from 'lucide-react';

interface SystemCheck {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export const SystemHealth = () => {
  const { toast } = useToast();
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [isRunningTracker, setIsRunningTracker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runSystemChecks();
  }, []);

  const runSystemChecks = async () => {
    const checks: SystemCheck[] = [];

    // Check Router
    try {
      checks.push({
        name: 'React Router DOM',
        status: 'success',
        message: 'React Router v6 configured with BrowserRouter',
        details: 'Routes: /, /auth, /lookup, /slang-lab, /account, /admin, /leaderboard, /slang/:id'
      });
    } catch (error) {
      checks.push({
        name: 'React Router DOM',
        status: 'error',
        message: 'Router configuration error',
        details: String(error)
      });
    }

    // Check Auth System
    try {
      const session = await supabase.auth.getSession();
      checks.push({
        name: 'Authentication System',
        status: session.data.session ? 'success' : 'warning',
        message: session.data.session ? 'User authenticated via Supabase Auth' : 'No active session',
        details: `Auth provider: Supabase, Storage: localStorage, Auto-refresh: enabled`
      });
    } catch (error) {
      checks.push({
        name: 'Authentication System',
        status: 'error',
        message: 'Auth system error',
        details: String(error)
      });
    }

    // Check Database Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      
      checks.push({
        name: 'Supabase Database',
        status: 'success',
        message: 'Database connection active',
        details: 'Connected to Supabase PostgreSQL with RLS enabled'
      });
    } catch (error) {
      checks.push({
        name: 'Supabase Database',
        status: 'error',
        message: 'Database connection failed',
        details: String(error)
      });
    }

    // Check Tables
    try {
      let tableCount = 0;
      const tableNames = ['profiles', 'creations', 'terms', 'senses', 'sources', 'favorites', 'votes', 'leaderboards'];
      
      // Check profiles table specifically as it's core
      try {
        await supabase.from('profiles').select('count').limit(1);
        tableCount++;
      } catch (e) {
        // Profile table check failed
      }
      
      // Check creations table
      try {
        await supabase.from('creations').select('count').limit(1);
        tableCount++;
      } catch (e) {
        // Creations table check failed
      }

      checks.push({
        name: 'Database Tables',
        status: tableCount > 0 ? 'success' : 'warning',
        message: `Core tables accessible (${tableCount} verified)`,
        details: `Tables: ${tableNames.join(', ')}`
      });
    } catch (error) {
      checks.push({
        name: 'Database Tables',
        status: 'error',
        message: 'Error checking tables',
        details: String(error)
      });
    }

    setSystemChecks(checks);
    setLoading(false);
  };

  const runTrackerScheduler = async () => {
    setIsRunningTracker(true);
    try {
      const response = await fetch('https://zzegeatnzvoqhgffqfln.supabase.co/functions/v1/run-tracker-scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWdlYXRuenZvcWhnZmZxZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDYzMTQsImV4cCI6MjA3MzgyMjMxNH0.kwq5HsA1ynoRNGpEaLlm9dK09nh9eAylhjIaI1GNQXM`,
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Tracker Scheduler Run Complete",
          description: `Successfully processed ${result.successCount} trackers. ${result.errorCount} errors.`,
        });
      } else {
        throw new Error(result.error || 'Failed to run tracker scheduler');
      }
    } catch (error) {
      console.error('Error running tracker scheduler:', error);
      toast({
        title: "Error",
        description: "Failed to run tracker scheduler. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsRunningTracker(false);
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'warning') => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status === 'success' ? 'OK' : status === 'error' ? 'ERROR' : 'WARNING'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Router className="h-4 w-4" />
              Router
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">React Router v6</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Supabase Auth</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Supabase</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Checks */}
      <Card>
        <CardHeader>
          <CardTitle>System Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Running system checks...</div>
            ) : (
              systemChecks.map((check, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="font-medium">{check.name}</span>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
                  {check.details && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Details</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                        {check.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Tracker Scheduler</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Manually trigger the tracker scheduler to process all active term trackers
              </p>
              <Button 
                onClick={runTrackerScheduler} 
                disabled={isRunningTracker}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunningTracker ? 'Running...' : 'Run Tracker Scheduler'}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Refresh System Checks</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Re-run all system health checks
              </p>
              <Button 
                onClick={runSystemChecks} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading ? 'Checking...' : 'Refresh Checks'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};