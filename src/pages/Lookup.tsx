import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Star, 
  RefreshCw, 
  Share, 
  ExternalLink, 
  AlertTriangle,
  Sparkles,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DefinitionData {
  meaning: string;
  tone: string;
  example: string;
  related: string[];
  warning: string;
  citations: Array<{
    title: string;
    url: string;
    quote: string;
    date?: string;
  }>;
  confidence: string;
}

const Lookup = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [definition, setDefinition] = useState<DefinitionData | null>(null);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      handleSearch(q);
    }
  }, [searchParams]);

  const handleSearch = async (searchTerm: string = query) => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call to edge function
      // Simulate API response for now
      setTimeout(() => {
        setDefinition({
          meaning: searchTerm === 'mid' 
            ? 'Average, mediocre, or of poor quality' 
            : 'Definition not yet available - please check back later',
          tone: searchTerm === 'mid' ? 'neutral' : 'neutral',
          example: searchTerm === 'mid' 
            ? 'That movie was pretty mid, nothing special.' 
            : 'Example not available yet.',
          related: searchTerm === 'mid' ? ['basic', 'mediocre', 'average'] : [],
          warning: searchTerm === 'mid' ? '' : 'Limited source data available',
          citations: searchTerm === 'mid' ? [
            {
              title: 'Urban Dictionary',
              url: 'https://urbandictionary.com',
              quote: 'Mid means mediocre or average',
              date: '2024-01-15'
            }
          ] : [],
          confidence: searchTerm === 'mid' ? 'High' : 'Low'
        });
        setLoading(false);
      }, 1500);

      // Update URL
      setSearchParams({ q: searchTerm });
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Unable to fetch definition. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save terms to your favorites.",
      });
      return;
    }
    
    toast({
      title: "Saved!",
      description: "Term added to your favorites.",
    });
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `SlangLab: ${query}`,
        text: definition?.meaning || 'Check out this slang definition',
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
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

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-confidence-high text-white';
      case 'Medium': return 'bg-confidence-medium text-white';
      case 'Low': return 'bg-confidence-low text-white';
      default: return 'bg-confidence-low text-white';
    }
  };

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
            <Link to="/lookup" className="text-sm font-medium">
              Lookup
            </Link>
            <Link to="/slang-lab" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Creator
            </Link>
            {user && (
              <Link to="/history" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                History
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-2">
            {user ? (
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
            ) : (
              <Button asChild variant="outline">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mx-auto max-w-2xl mb-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <Input
              placeholder="Enter slang term to decode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-lg"
            />
            <Button type="submit" disabled={loading} size="lg">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Results */}
        {loading && (
          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-8 text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Searching for reliable definitions...</p>
            </CardContent>
          </Card>
        )}

        {definition && !loading && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{query}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getConfidenceColor(definition.confidence)}>
                      {definition.confidence} Confidence
                    </Badge>
                    <Badge variant="outline" className={getToneColor(definition.tone)}>
                      {definition.tone}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSave}>
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSearch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Warning */}
              {definition.warning && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{definition.warning}</p>
                </div>
              )}

              {/* Meaning */}
              <div>
                <h3 className="font-semibold mb-2">Meaning</h3>
                <p className="text-lg">{definition.meaning}</p>
              </div>

              {/* Example */}
              <div>
                <h3 className="font-semibold mb-2">Example</h3>
                <p className="italic text-muted-foreground">"{definition.example}"</p>
              </div>

              {/* Related Terms */}
              {definition.related.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Related Terms</h3>
                  <div className="flex flex-wrap gap-2">
                    {definition.related.map((term) => (
                      <Badge key={term} variant="secondary" className="cursor-pointer" 
                             onClick={() => { setQuery(term); handleSearch(term); }}>
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations */}
              {definition.citations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sources</h3>
                  <div className="space-y-3">
                    {definition.citations.map((citation, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{citation.title}</h4>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={citation.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">"{citation.quote}"</p>
                        {citation.date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Published: {new Date(citation.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!definition && !loading && query && (
          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Start typing to search for slang definitions</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Lookup;