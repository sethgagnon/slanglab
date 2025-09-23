import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, TestTube, Clock, Settings } from 'lucide-react';

interface SourceRule {
  id: string;
  source_name: string | null;
  source_type: string | null;
  domain: string;
  status: string;
  enabled: boolean;
  domains_allowlist: any;
  domains_blocklist: any;
  languages: any;
  min_score: number;
  per_run_cap: number;
  last_run_at: string | null;
  config: any;
  created_at: string;
  updated_at: string | null;
}

export const APISourceManagement = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<SourceRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    const { data, error } = await supabase
      .from('source_rules')
      .select('*')
      .order('source_name');

    if (error) {
      toast({
        title: "Error loading sources",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const transformedData = (data || []).map(item => ({
        ...item,
        domains_allowlist: Array.isArray(item.domains_allowlist) ? item.domains_allowlist : [],
        domains_blocklist: Array.isArray(item.domains_blocklist) ? item.domains_blocklist : [],
        languages: Array.isArray(item.languages) ? item.languages : ['en'],
        config: typeof item.config === 'object' ? item.config : {},
        source_name: item.source_name || '',
        source_type: item.source_type || ''
      }));
      setSources(transformedData);
    }
    setLoading(false);
  };

  const updateSource = async (id: string, updates: Partial<SourceRule>) => {
    const { error } = await supabase
      .from('source_rules')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating source",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Source updated",
        description: "Configuration saved successfully",
      });
      loadSources();
    }
  };

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    switch (status) {
      case 'allow':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'block':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return 'Never';
    const date = new Date(lastRun);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const addDomain = (sourceId: string, domain: string, listType: 'allowlist' | 'blocklist') => {
    if (!domain.trim()) return;
    
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const currentList = Array.isArray(listType === 'allowlist' ? source.domains_allowlist : source.domains_blocklist) 
      ? (listType === 'allowlist' ? source.domains_allowlist : source.domains_blocklist) 
      : [];
    if (currentList.includes(domain)) return;

    const newList = [...currentList, domain];
    updateSource(sourceId, {
      [listType === 'allowlist' ? 'domains_allowlist' : 'domains_blocklist']: newList
    });
  };

  const removeDomain = (sourceId: string, domain: string, listType: 'allowlist' | 'blocklist') => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const currentList = Array.isArray(listType === 'allowlist' ? source.domains_allowlist : source.domains_blocklist) 
      ? (listType === 'allowlist' ? source.domains_allowlist : source.domains_blocklist) 
      : [];
    const newList = currentList.filter(d => d !== domain);
    updateSource(sourceId, {
      [listType === 'allowlist' ? 'domains_allowlist' : 'domains_blocklist']: newList
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading API sources...</div>
        </CardContent>
      </Card>
    );
  }

  const googleSource = sources.find(s => s.source_name === 'google_cse');
  const serpApiSource = sources.find(s => s.source_name === 'SerpAPI');

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Source Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google CSE</TabsTrigger>
            <TabsTrigger value="serpapi">SerpAPI</TabsTrigger>
          </TabsList>

          {/* Google Custom Search */}
          <TabsContent value="google">
            {googleSource && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Google Custom Search Engine
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Search the web using Google's Custom Search API
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(googleSource.status, googleSource.enabled)}
                    <Switch
                      checked={googleSource.enabled}
                      onCheckedChange={(enabled) => updateSource(googleSource.id, { enabled })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Quality Score: {googleSource.min_score}</Label>
                    <Slider
                      value={[googleSource.min_score]}
                      onValueChange={([value]) => updateSource(googleSource.id, { min_score: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Results Per Run: {googleSource.per_run_cap}</Label>
                    <Slider
                      value={[googleSource.per_run_cap]}
                      onValueChange={([value]) => updateSource(googleSource.id, { per_run_cap: value })}
                      max={100}
                      min={1}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Allowed Domains</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add domain (e.g., example.com)"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addDomain(googleSource.id, e.currentTarget.value, 'allowlist');
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(googleSource.domains_allowlist) ? googleSource.domains_allowlist : []).map((domain) => (
                          <Badge key={domain} variant="secondary" className="text-xs">
                            {domain}
                            <button
                              onClick={() => removeDomain(googleSource.id, domain, 'allowlist')}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Blocked Domains</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add domain to block"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addDomain(googleSource.id, e.currentTarget.value, 'blocklist');
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button size="sm" variant="destructive">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(googleSource.domains_blocklist) ? googleSource.domains_blocklist : []).map((domain) => (
                          <Badge key={domain} variant="destructive" className="text-xs">
                            {domain}
                            <button
                              onClick={() => removeDomain(googleSource.id, domain, 'blocklist')}
                              className="ml-1 hover:text-white"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last run: {formatLastRun(googleSource.last_run_at)}
                  </div>
                  <Button variant="outline" size="sm">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* SerpAPI */}
          <TabsContent value="serpapi">
            {serpApiSource && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      SerpAPI Integration
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Search Google News and web results using SerpAPI
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(serpApiSource.status, serpApiSource.enabled)}
                    <Switch
                      checked={serpApiSource.enabled}
                      onCheckedChange={(enabled) => updateSource(serpApiSource.id, { enabled })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Quality Score: {serpApiSource.min_score}</Label>
                    <Slider
                      value={[serpApiSource.min_score]}
                      onValueChange={([value]) => updateSource(serpApiSource.id, { min_score: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Results Per Run: {serpApiSource.per_run_cap}</Label>
                    <Slider
                      value={[serpApiSource.per_run_cap]}
                      onValueChange={([value]) => updateSource(serpApiSource.id, { per_run_cap: value })}
                      max={100}
                      min={1}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last run: {formatLastRun(serpApiSource.last_run_at)}
                  </div>
                  <Button variant="outline" size="sm">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};