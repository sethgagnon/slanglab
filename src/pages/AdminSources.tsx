import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, TestTube, Shield, Clock, Settings } from 'lucide-react';
import { Navigate } from 'react-router-dom';

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

const AdminSources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sources, setSources] = useState<SourceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceRule | null>(null);

  useEffect(() => {
    checkAdminStatus();
    loadSources();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    setIsAdmin(profile?.role === 'admin');
  };

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
      // Transform the data to ensure proper types
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const googleSource = sources.find(s => s.source_type === 'search_api');
  const newsSource = sources.find(s => s.source_type === 'news_api');
  const redditSource = sources.find(s => s.source_type === 'social_api');
  const youtubeSource = sources.find(s => s.source_type === 'video_api');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Source Management</h1>
        <p className="text-muted-foreground">
          Configure and manage external data sources for content discovery and monitoring.
        </p>
      </div>

      <Tabs defaultValue="google" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="google">Google CSE</TabsTrigger>
          <TabsTrigger value="news">NewsAPI</TabsTrigger>
          <TabsTrigger value="reddit" disabled>Reddit</TabsTrigger>
          <TabsTrigger value="youtube" disabled>YouTube</TabsTrigger>
        </TabsList>

        {/* Google Custom Search */}
        <TabsContent value="google">
          {googleSource && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Google Custom Search Engine
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
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
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="google-key">API Key</Label>
                    <Input
                      id="google-key"
                      type="password"
                      placeholder="Google API Key (stored securely)"
                      defaultValue="••••••••••••••••"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your API key from Google Cloud Console
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="google-cse">CSE ID</Label>
                    <Input
                      id="google-cse"
                      placeholder="Custom Search Engine ID"
                      defaultValue="••••••••••••••••"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Custom Search Engine identifier
                    </p>
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
                        <Button size="sm" onClick={() => {}}>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* NewsAPI */}
        <TabsContent value="news">
          {newsSource && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    NewsAPI Integration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Access breaking news and articles from thousands of sources
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(newsSource.status, newsSource.enabled)}
                  <Switch
                    checked={newsSource.enabled}
                    onCheckedChange={(enabled) => updateSource(newsSource.id, { enabled })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="news-key">NewsAPI Key</Label>
                  <Input
                    id="news-key"
                    type="password"
                    placeholder="NewsAPI Key (stored securely)"
                    defaultValue="••••••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your API key from newsapi.org
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Quality Score: {newsSource.min_score}</Label>
                    <Slider
                      value={[newsSource.min_score]}
                      onValueChange={([value]) => updateSource(newsSource.id, { min_score: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Articles Per Run: {newsSource.per_run_cap}</Label>
                    <Slider
                      value={[newsSource.per_run_cap]}
                      onValueChange={([value]) => updateSource(newsSource.id, { per_run_cap: value })}
                      max={100}
                      min={1}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Supported Languages</Label>
                  <Select onValueChange={(value) => {
                    const currentLangs = Array.isArray(newsSource.languages) ? newsSource.languages : ['en'];
                    if (!currentLangs.includes(value)) {
                      updateSource(newsSource.id, { languages: [...currentLangs, value] });
                    }
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Add language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(Array.isArray(newsSource.languages) ? newsSource.languages : ['en']).map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                        <button
                          onClick={() => {
                            const currentLangs = Array.isArray(newsSource.languages) ? newsSource.languages : ['en'];
                            const newLangs = currentLangs.filter(l => l !== lang);
                            updateSource(newsSource.id, { languages: newLangs });
                          }}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last run: {formatLastRun(newsSource.last_run_at)}
                  </div>
                  <Button variant="outline" size="sm">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reddit - Coming Soon */}
        <TabsContent value="reddit">
          {redditSource && (
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Reddit API Integration
                  <Badge>Coming Soon</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor trending content and discussions across Reddit communities
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Reddit integration is planned for a future release. This will enable monitoring
                    of trending slang terms across various subreddits and communities.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* YouTube - Coming Soon */}
        <TabsContent value="youtube">
          {youtubeSource && (
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  YouTube API Integration
                  <Badge>Coming Soon</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Discover trending terms from YouTube videos and comments
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    YouTube integration is planned for a future release. This will enable discovery
                    of trending slang from video titles, descriptions, and comment sections.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSources;