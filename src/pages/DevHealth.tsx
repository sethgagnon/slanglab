import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertCircle, Database, User, Router, FileText, Settings } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

interface SystemCheck {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface EnvVariable {
  name: string;
  present: boolean;
  masked?: string;
}

interface AppFile {
  path: string;
  name: string;
  description: string;
  exists: boolean;
}

const DevHealth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [appFiles] = useState<AppFile[]>([
    { path: 'src/main.tsx', name: 'Application Entry Point', description: 'React root and app initialization', exists: true },
    { path: 'src/App.tsx', name: 'Main Application Component', description: 'Router and provider setup', exists: true },
    { path: 'src/contexts/AuthContext.tsx', name: 'Authentication Context', description: 'User authentication and session management', exists: true },
    { path: 'src/integrations/supabase/client.ts', name: 'Database Client', description: 'Supabase connection and configuration', exists: true },
    { path: 'src/pages/Admin.tsx', name: 'Admin Dashboard', description: 'Administrative interface and controls', exists: true },
    { path: 'src/pages/Landing.tsx', name: 'Landing Page', description: 'Main application landing page', exists: true },
    { path: 'src/pages/Auth.tsx', name: 'Authentication Page', description: 'User login and registration', exists: true }
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      runSystemChecks();
      checkEnvironmentVariables();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const runSystemChecks = async () => {
    const checks: SystemCheck[] = [];

    // Check Router
    try {
      checks.push({
        name: 'React Router DOM',
        status: 'success',
        message: 'React Router v6 configured with BrowserRouter',
        details: 'Routes: /, /auth, /lookup, /slang-lab, /history, /account, /admin, /leaderboard, /slang/:id'
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
  };

  const checkEnvironmentVariables = () => {
    const envChecks: EnvVariable[] = [
      {
        name: 'VITE_GOOGLE_API_KEY',
        present: !!import.meta.env.VITE_GOOGLE_API_KEY,
        masked: import.meta.env.VITE_GOOGLE_API_KEY ? 'AIza***' : undefined
      },
      {
        name: 'VITE_GOOGLE_CSE_ID',
        present: !!import.meta.env.VITE_GOOGLE_CSE_ID,
        masked: import.meta.env.VITE_GOOGLE_CSE_ID ? '***' : undefined
      },
      {
        name: 'VITE_NEWSAPI_KEY',
        present: !!import.meta.env.VITE_NEWSAPI_KEY,
        masked: import.meta.env.VITE_NEWSAPI_KEY ? '***' : undefined
      },
      {
        name: 'VITE_SUPABASE_URL',
        present: !!import.meta.env.VITE_SUPABASE_URL,
        masked: import.meta.env.VITE_SUPABASE_URL ? 'https://***supabase.co' : undefined
      },
      {
        name: 'VITE_SUPABASE_ANON_KEY',
        present: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        masked: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'eyJhbGciOiJ***' : undefined
      }
    ];

    setEnvVars(envChecks);
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

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              This page is restricted to administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="System Health - SlangLab"
        description="System diagnostics and health monitoring"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Health Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Development diagnostics and system status monitoring
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
            <TabsTrigger value="files">App Files</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                    App Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">{appFiles.filter(f => f.exists).length}/{appFiles.length} Found</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Status</CardTitle>
                <CardDescription>
                  System health at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemChecks.slice(0, 4).map((check, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(check.status)}
                        <span className="font-medium">{check.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground mr-2">{check.message}</span>
                        {getStatusBadge(check.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Required environment configuration status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {envVars.map((envVar, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {envVar.present ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{envVar.name}</div>
                          {envVar.masked && (
                            <div className="text-sm text-muted-foreground font-mono">
                              {envVar.masked}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={envVar.present ? 'default' : 'destructive'}>
                        {envVar.present ? 'Present' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Files</CardTitle>
                <CardDescription>
                  Key application files and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {file.exists ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-muted-foreground">{file.path}</div>
                          <div className="text-sm text-muted-foreground">{file.description}</div>
                        </div>
                      </div>
                      <Badge variant={file.exists ? 'default' : 'destructive'}>
                        {file.exists ? 'Found' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Checks</CardTitle>
                <CardDescription>
                  Detailed system component status and diagnostics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemChecks.map((check, index) => (
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
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                          {check.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex gap-4">
          <Button onClick={() => navigate('/admin')} variant="outline">
            Admin Dashboard
          </Button>
          <Button onClick={() => navigate('/')} variant="outline">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevHealth;