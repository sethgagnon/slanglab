import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Shield, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SearchSource {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
  is_required: boolean;
  quality_score: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SourceFormData {
  name: string;
  base_url: string;
  enabled: boolean;
  quality_score: number;
  notes: string;
}

const initialFormData: SourceFormData = {
  name: '',
  base_url: '',
  enabled: true,
  quality_score: 50,
  notes: ''
};

export const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<SourceFormData>(initialFormData);
  const [editingSource, setEditingSource] = useState<SearchSource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSources();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('source_management_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'search_sources'
        },
        () => {
          loadSources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('search_sources')
        .select('*')
        .order('quality_score', { ascending: false });

      if (error) throw error;

      setSources(data || []);
    } catch (error) {
      console.error('Failed to load sources:', error);
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Source name is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.base_url.trim()) {
      toast({
        title: "Validation Error", 
        description: "Base URL is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.base_url.match(/^https?:\/\/.+/)) {
      toast({
        title: "Validation Error",
        description: "Base URL must be a valid HTTP(S) URL.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setActionLoading('save');
    
    try {
      const payload = {
        name: formData.name.trim(),
        base_url: formData.base_url.trim(),
        enabled: formData.enabled,
        quality_score: formData.quality_score,
        notes: formData.notes.trim() || null
      };

      if (editingSource) {
        // Update existing source
        const { error } = await supabase
          .from('search_sources')
          .update(payload)
          .eq('id', editingSource.id);

        if (error) throw error;

        toast({
          title: "Source Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new source
        const { error } = await supabase
          .from('search_sources')
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Source Created",
          description: `${formData.name} has been added successfully.`,
        });
      }

      setIsDialogOpen(false);
      setEditingSource(null);
      setFormData(initialFormData);
      
    } catch (error: any) {
      console.error('Failed to save source:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (source: SearchSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      base_url: source.base_url,
      enabled: source.enabled,
      quality_score: source.quality_score,
      notes: source.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (source: SearchSource) => {
    if (source.is_required) {
      toast({
        title: "Cannot Delete",
        description: "Required sources cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(`delete-${source.id}`);

    try {
      const { error } = await supabase
        .from('search_sources')
        .delete()
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Source Deleted",
        description: `${source.name} has been removed.`,
      });
      
    } catch (error: any) {
      console.error('Failed to delete source:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEnabled = async (source: SearchSource) => {
    setActionLoading(`toggle-${source.id}`);

    try {
      const { error } = await supabase
        .from('search_sources')
        .update({ enabled: !source.enabled })
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Source Updated",
        description: `${source.name} has been ${!source.enabled ? 'enabled' : 'disabled'}.`,
      });
      
    } catch (error: any) {
      console.error('Failed to toggle source:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update source. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateDialog = () => {
    setEditingSource(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Sources</CardTitle>
          <CardDescription>Loading sources...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Top Sources
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSource ? 'Edit Source' : 'Add New Source'}
                </DialogTitle>
                <DialogDescription>
                  {editingSource 
                    ? 'Update the source configuration.'
                    : 'Add a new external source for slang searches.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Reddit"
                  />
                </div>
                
                <div>
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://www.reddit.com"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="enabled">Enabled</Label>
                </div>
                
                <div>
                  <Label htmlFor="quality_score">Quality Score: {formData.quality_score}</Label>
                  <Slider
                    id="quality_score"
                    min={0}
                    max={100}
                    step={5}
                    value={[formData.quality_score]}
                    onValueChange={(values) => setFormData(prev => ({ ...prev, quality_score: values[0] }))}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low Priority (0)</span>
                    <span>High Priority (100)</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this source..."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleSave}
                  disabled={actionLoading === 'save'}
                >
                  {actionLoading === 'save' ? 'Saving...' : (editingSource ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage external sources used for slang searches. Top 5 sources by quality score are used.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {sources.map((source, index) => (
            <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{source.name}</h4>
                  {source.is_required && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Required
                    </Badge>
                  )}
                  {!source.enabled && (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                  {index < 5 && source.enabled && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <code className="text-xs">{source.base_url}</code>
                  <span>•</span>
                  <span>Quality: {source.quality_score}</span>
                </div>
                
                {source.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{source.notes}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={source.enabled}
                  onCheckedChange={() => handleToggleEnabled(source)}
                  disabled={actionLoading === `toggle-${source.id}`}
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(source)}
                  disabled={!!actionLoading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(source)}
                  disabled={source.is_required || actionLoading === `delete-${source.id}`}
                  title={source.is_required ? "Required sources cannot be deleted" : "Delete source"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {sources.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sources configured.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add sources to enable dynamic search functionality.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};