import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  User,
  LogOut,
  AlertTriangle,
  Shield,
  Ban,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SourceManagement } from '@/components/admin/SourceManagement';
import { ProtectedFeature } from '@/components/ProtectedFeature';

interface Report {
  id: string;
  term: string;
  reason: string;
  status: 'open' | 'closed';
  created_at: string;
  user_email: string;
}

interface SourceRule {
  id: string;
  domain: string;
  status: 'allow' | 'deny';
  created_at: string;
}

interface BannedTerm {
  id: string;
  phrase: string;
  created_at: string;
}

const Admin = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [sourceRules, setSourceRules] = useState<SourceRule[]>([]);
  const [bannedTerms, setBannedTerms] = useState<BannedTerm[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainStatus, setNewDomainStatus] = useState<'allow' | 'deny'>('allow');
  const [newBannedTerm, setNewBannedTerm] = useState('');
  const [isRunningTracker, setIsRunningTracker] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    // TODO: Replace with actual API calls
    // Mock data for now
    setReports([
      {
        id: '1',
        term: 'inappropriate-term',
        reason: 'Contains offensive content',
        status: 'open',
        created_at: '2024-01-15T10:30:00Z',
        user_email: 'user@example.com'
      },
      {
        id: '2',
        term: 'spam-content',
        reason: 'Spam or misleading information',
        status: 'closed',
        created_at: '2024-01-14T15:45:00Z',
        user_email: 'another@example.com'
      }
    ]);

    setSourceRules([
      {
        id: '1',
        domain: 'urbandictionary.com',
        status: 'allow',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        domain: 'spam-site.com',
        status: 'deny',
        created_at: '2024-01-10T12:00:00Z'
      }
    ]);

    setBannedTerms([
      {
        id: '1',
        phrase: 'harmful-slur',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        phrase: 'harassment-term',
        created_at: '2024-01-05T10:00:00Z'
      }
    ]);
  };

  const handleReportStatusChange = async (reportId: string, newStatus: 'open' | 'closed') => {
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { ...report, status: newStatus }
        : report
    ));

    toast({
      title: "Report updated",
      description: `Report marked as ${newStatus}.`,
    });
  };

  const addSourceRule = async () => {
    if (!newDomain.trim()) return;

    const newRule: SourceRule = {
      id: Date.now().toString(),
      domain: newDomain.trim(),
      status: newDomainStatus,
      created_at: new Date().toISOString()
    };

    setSourceRules(prev => [newRule, ...prev]);
    setNewDomain('');
    
    toast({
      title: "Source rule added",
      description: `Domain ${newDomain} set to ${newDomainStatus}.`,
    });
  };

  const removeSourceRule = async (ruleId: string) => {
    setSourceRules(prev => prev.filter(rule => rule.id !== ruleId));
    toast({
      title: "Source rule removed",
      description: "Domain rule has been deleted.",
    });
  };

  const addBannedTerm = async () => {
    if (!newBannedTerm.trim()) return;

    const newBanned: BannedTerm = {
      id: Date.now().toString(),
      phrase: newBannedTerm.trim().toLowerCase(),
      created_at: new Date().toISOString()
    };

    setBannedTerms(prev => [newBanned, ...prev]);
    setNewBannedTerm('');
    
    toast({
      title: "Term banned",
      description: `"${newBannedTerm}" has been added to the banned list.`,
    });
  };

  const removeBannedTerm = async (termId: string) => {
    setBannedTerms(prev => prev.filter(term => term.id !== termId));
    toast({
      title: "Term unbanned",
      description: "Term has been removed from the banned list.",
    });
  };

  const runTrackerScheduler = async () => {
    setIsRunningTracker(true);
    try {
      const response = await fetch('https://zzegeatnzvoqhgffqfln.supabase.co/functions/v1/run-tracker-scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWdlYXRuenZvcWhnZmZxZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDYzMTQsImV4cCI6MjA3MzgyMjMxNH0.kwq5HsA1ynoRNGpEaLlm9dK09nh9eAylhjIaI1GNQXM'}`,
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

  return (
    <ProtectedFeature config={{ requiresAdmin: true }} showCard={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">SlangLab</span>
              <Badge variant="destructive" className="ml-2">Admin</Badge>
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

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage reports, source rules, and content moderation
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reports" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="sources">Source Rules</TabsTrigger>
              <TabsTrigger value="banned">Banned Terms</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="logs">Moderation Logs</TabsTrigger>
            </TabsList>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Reports</CardTitle>
                  <CardDescription>Review and manage user-submitted reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">"{report.term}"</h3>
                              <Badge variant={report.status === 'open' ? 'destructive' : 'secondary'}>
                                {report.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{report.reason}</p>
                            <div className="text-xs text-muted-foreground">
                              Reported by {report.user_email} on {new Date(report.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {/* TODO: View term details */}}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === 'open' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReportStatusChange(report.id, 'closed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Close
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReportStatusChange(report.id, 'open')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reopen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {reports.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No reports</h3>
                        <p className="text-muted-foreground">All clear! No user reports to review.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Source Rules Tab */}
            <TabsContent value="sources" className="space-y-4">
              {/* Top Sources Management */}
              <SourceManagement />
              
              {/* Domain Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Source Domain Rules</CardTitle>
                  <CardDescription>Manage which domains are allowed or denied for citations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add New Rule */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Add New Domain Rule</h3>
                      <div className="flex gap-2">
                        <Input
                          placeholder="example.com"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                        />
                        <select 
                          value={newDomainStatus} 
                          onChange={(e) => setNewDomainStatus(e.target.value as 'allow' | 'deny')}
                          className="px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="allow">Allow</option>
                          <option value="deny">Deny</option>
                        </select>
                        <Button onClick={addSourceRule}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Existing Rules */}
                    <div className="space-y-2">
                      {sourceRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <code className="text-sm">{rule.domain}</code>
                            <Badge variant={rule.status === 'allow' ? 'secondary' : 'destructive'}>
                              {rule.status}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSourceRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Banned Terms Tab */}
            <TabsContent value="banned" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Banned Terms</CardTitle>
                  <CardDescription>Manage terms that are blocked from definitions and generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Add New Banned Term */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Add Banned Term</h3>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter term to ban..."
                          value={newBannedTerm}
                          onChange={(e) => setNewBannedTerm(e.target.value)}
                        />
                        <Button onClick={addBannedTerm}>
                          <Ban className="h-4 w-4 mr-1" />
                          Ban Term
                        </Button>
                      </div>
                    </div>

                    {/* Existing Banned Terms */}
                    <div className="space-y-2">
                      {bannedTerms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <code className="text-sm">{term.phrase}</code>
                            <span className="text-xs text-muted-foreground">
                              Banned {new Date(term.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBannedTerm(term.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Testing Tab */}
            <TabsContent value="testing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Testing</CardTitle>
                  <CardDescription>Manually trigger system functions for testing purposes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Tracker System</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Manually run the tracker scheduler to test SerpAPI and Google Custom Search integration without waiting for the cron job.
                      </p>
                      <Button 
                        onClick={runTrackerScheduler}
                        disabled={isRunningTracker}
                        className="w-full sm:w-auto"
                      >
                        {isRunningTracker ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Running Trackers...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Tracker Scheduler
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Moderation Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Logs</CardTitle>
                  <CardDescription>View system moderation actions and decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground">Moderation logs will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedFeature>
  );
};

export default Admin;
