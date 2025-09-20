import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Star, 
  Search, 
  Filter,
  User,
  LogOut,
  StarOff,
  Calendar,
  Clock,
  Zap,
  PlusCircle,
  Share2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreations } from '@/hooks/useCreations';
import { SharePanel } from '@/components/SharePanel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HistoryItem {
  id: string;
  term: string;
  confidence: string;
  tone: string;
  meaning: string;
  created_at: string;
  is_favorite: boolean;
}

interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  creation_type: string;
  vibe?: string;
  created_at: string;
}

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [toneFilter, setToneFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [lookups, setLookups] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const { creations, loading: creationsLoading, refresh: refreshCreations, deleteCreation } = useCreations();

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('user-history', {
        body: { 
          filters: {
            search: searchTerm,
            tone: toneFilter,
            dateRange: dateFilter
          },
          page: 1,
          limit: 50
        }
      });

      if (error) {
        throw error;
      }

      setLookups(data.lookups || []);
      setFavorites(data.favorites || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
      toast({
        title: "Load failed",
        description: error.message || "Unable to load history.",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (itemId: string) => {
    try {
      const item = lookups.find(l => l.id === itemId);
      if (!item) return;

      // Find the actual term ID from the database
      const { data: termData } = await supabase
        .from('terms')
        .select('id')
        .eq('text', item.term)
        .single();

      if (!termData) {
        throw new Error('Term not found');
      }

      const { data, error } = await supabase.functions.invoke('manage-favorites', {
        body: { 
          action: item.is_favorite ? 'remove' : 'add',
          itemId: termData.id,
          itemType: 'term'
        }
      });

      if (error) {
        throw error;
      }

      // Update local state
      setLookups(prev => prev.map(lookup => 
        lookup.id === itemId 
          ? { ...lookup, is_favorite: !lookup.is_favorite }
          : lookup
      ));

      setFavorites(prev => {
        if (item.is_favorite) {
          return prev.filter(f => f.id !== itemId);
        } else {
          return [...prev, { ...item, is_favorite: true }];
        }
      });

      toast({
        title: "Updated",
        description: data.message || "Favorite status updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Unable to update favorite.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCreation = async (creationId: string) => {
    try {
      await deleteCreation(creationId);
      toast({
        title: "Deleted",
        description: "Creation deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Unable to delete creation.",
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-confidence-high text-white';
      case 'Medium': return 'bg-confidence-medium text-white';
      case 'Low': return 'bg-confidence-low text-white';
      default: return 'bg-confidence-low text-white';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'positive': return 'border-tone-positive text-tone-positive';
      case 'neutral': return 'border-tone-neutral text-tone-neutral';
      case 'insulting': return 'border-tone-insulting text-tone-insulting';
      case 'adult': return 'border-tone-adult text-tone-adult';
      case 'niche': return 'border-tone-niche text-tone-niche';
      default: return 'border-tone-neutral text-tone-neutral';
    }
  };

  const filterItems = (items: HistoryItem[]) => {
    return items.filter(item => {
      const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.meaning.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTone = toneFilter === 'all' || item.tone === toneFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = itemDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = itemDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = itemDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesTone && matchesDate;
    });
  };

  const filterCreations = (items: Creation[]) => {
    return items.filter(item => {
      const matchesSearch = item.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.meaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.example.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = itemDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = itemDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = itemDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesDate;
    });
  };

  const getCreationTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-primary text-primary-foreground';
      case 'ai': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVibeColor = (vibe?: string) => {
    if (!vibe) return 'border-muted text-muted-foreground';
    switch (vibe) {
      case 'cool': return 'border-blue-500 text-blue-500';
      case 'funny': return 'border-yellow-500 text-yellow-500';
      case 'edgy': return 'border-red-500 text-red-500';
      case 'cute': return 'border-pink-500 text-pink-500';
      case 'smart': return 'border-purple-500 text-purple-500';
      default: return 'border-muted text-muted-foreground';
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your lookup history and favorites.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredLookups = filterItems(lookups);
  const filteredFavorites = filterItems(favorites);
  const filteredCreations = filterCreations(creations);

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
            <Link to="/history" className="text-sm font-medium">
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
          <h1 className="text-3xl font-bold mb-2">Your History</h1>
          <p className="text-muted-foreground">
            Track your slang discoveries and manage your favorites
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search terms or meanings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={toneFilter} onValueChange={setToneFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All tones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tones</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="insulting">Insulting</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="niche">Niche</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">Recent Lookups</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="creations">My Creations</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {filteredLookups.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No lookups found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || toneFilter !== 'all' || dateFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms.'
                      : 'Start exploring slang to build your history!'
                    }
                  </p>
                  <Button asChild>
                    <Link to="/lookup">
                      <Search className="mr-2 h-4 w-4" />
                      Start Exploring
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLookups.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{item.term}</h3>
                            <Badge className={getConfidenceColor(item.confidence)}>
                              {item.confidence}
                            </Badge>
                            <Badge variant="outline" className={getToneColor(item.tone)}>
                              {item.tone}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{item.meaning}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(item.id)}
                        >
                          {item.is_favorite ? (
                            <Star className="h-4 w-4 fill-current text-primary" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {filteredFavorites.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Star terms from your lookups to save them here for quick access.
                  </p>
                  <Button asChild>
                    <Link to="/lookup">
                      <Search className="mr-2 h-4 w-4" />
                      Find Terms to Save
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFavorites.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{item.term}</h3>
                            <Badge className={getConfidenceColor(item.confidence)}>
                              {item.confidence}
                            </Badge>
                            <Badge variant="outline" className={getToneColor(item.tone)}>
                              {item.tone}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{item.meaning}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(item.id)}
                        >
                          <Star className="h-4 w-4 fill-current text-primary" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creations" className="space-y-4">
            {creationsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading your creations...</p>
                </CardContent>
              </Card>
            ) : filteredCreations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No creations yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || dateFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms.'
                      : 'Start creating your own slang in the lab!'
                    }
                  </p>
                  <Button asChild>
                    <Link to="/slang-lab">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Slang
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCreations.map((creation) => (
                  <Card key={creation.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{creation.phrase}</h3>
                            <Badge className={getCreationTypeColor(creation.creation_type)}>
                              {creation.creation_type === 'manual' ? 'Manual' : 'AI Generated'}
                            </Badge>
                            {creation.vibe && (
                              <Badge variant="outline" className={getVibeColor(creation.vibe)}>
                                {creation.vibe}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-2">{creation.meaning}</p>
                          <p className="text-sm text-muted-foreground mb-3 italic">
                            Example: "{creation.example}"
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {new Date(creation.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SharePanel 
                            creation={{
                              ...creation,
                              vibe: creation.vibe || 'cool'
                            }} 
                            userId={user.id}
                            className="ml-4"
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Creation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{creation.phrase}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCreation(creation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default History;