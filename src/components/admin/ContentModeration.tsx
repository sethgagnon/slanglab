import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Eye, CheckCircle, XCircle, Ban } from 'lucide-react';

interface Report {
  id: string;
  reported_content_type: string;
  reported_content_id: string;
  reporter_user_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
}

interface BannedTerm {
  id: string;
  phrase: string;
  created_at: string;
}

export const ContentModeration = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedTerms, setBannedTerms] = useState<BannedTerm[]>([]);
  const [newBannedTerm, setNewBannedTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load reports
    const { data: reportsData, error: reportsError } = await supabase
      .from('content_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsError) {
      toast({
        title: "Error loading reports",
        description: reportsError.message,
        variant: "destructive",
      });
    } else {
      setReports(reportsData || []);
    }

    // Load banned terms
    const { data: bannedData, error: bannedError } = await supabase
      .from('banned_terms')
      .select('*')
      .order('created_at', { ascending: false });

    if (bannedError) {
      toast({
        title: "Error loading banned terms",
        description: bannedError.message,
        variant: "destructive",
      });
    } else {
      setBannedTerms(bannedData || []);
    }

    setLoading(false);
  };

  const handleReportStatusChange = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from('content_reports')
      .update({ 
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', reportId);

    if (error) {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Report updated",
        description: `Report marked as ${newStatus}.`,
      });
      loadData();
    }
  };

  const addBannedTerm = async () => {
    if (!newBannedTerm.trim()) return;

    const { error } = await supabase
      .from('banned_terms')
      .insert([{ phrase: newBannedTerm.trim().toLowerCase() }]);

    if (error) {
      toast({
        title: "Error adding banned term",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Term banned",
        description: `"${newBannedTerm}" has been added to the banned list.`,
      });
      setNewBannedTerm('');
      loadData();
    }
  };

  const removeBannedTerm = async (termId: string) => {
    const { error } = await supabase
      .from('banned_terms')
      .delete()
      .eq('id', termId);

    if (error) {
      toast({
        title: "Error removing banned term",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Term unbanned",
        description: "Term has been removed from the banned list.",
      });
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading moderation data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle>User Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{report.reported_content_type}</h3>
                      <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{report.reason}</p>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Reported on {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: View content details */}}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {report.status === 'pending' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReportStatusChange(report.id, 'resolved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReportStatusChange(report.id, 'pending')}
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

      {/* Banned Terms Section */}
      <Card>
        <CardHeader>
          <CardTitle>Banned Terms</CardTitle>
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
    </div>
  );
};
