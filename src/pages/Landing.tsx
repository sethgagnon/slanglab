import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Sparkles, Shield, TrendingUp, User, LogOut, History, Settings, Menu, CreditCard, Trophy } from 'lucide-react';
import { useTrendingTerms } from '@/hooks/useTrendingTerms';
import { SEOHead, createWebsiteSchema } from '@/components/SEOHead';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_TERMS = [{
  term: 'mid',
  confidence: 'High',
  tone: 'neutral'
}, {
  term: 'rizz',
  confidence: 'High',
  tone: 'positive'
}, {
  term: 'delulu',
  confidence: 'Medium',
  tone: 'niche'
}, {
  term: 'lowkey',
  confidence: 'High',
  tone: 'neutral'
}, {
  term: 'gyat',
  confidence: 'Medium',
  tone: 'adult'
}, {
  term: 'girl dinner',
  confidence: 'High',
  tone: 'neutral'
}, {
  term: 'ratio',
  confidence: 'High',
  tone: 'neutral'
}, {
  term: 'sigma',
  confidence: 'Medium',
  tone: 'niche'
}, {
  term: 'skibidi',
  confidence: 'Low',
  tone: 'niche'
}, {
  term: 'the ick',
  confidence: 'High',
  tone: 'insulting'
}];

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const {
    trendingTerms,
    lastUpdated
  } = useTrendingTerms();
  
  const handleTermClick = (term: string) => {
    navigate(`/lookup?q=${encodeURIComponent(term)}`);
  };
  
  const handleChipClick = (term: string) => {
    setSearchTerm(term);
  };
  
  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/lookup?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSignInClick = async () => {
    console.log('Sign In button clicked');
    setIsNavigating(true);
    
    try {
      navigate('/auth');
      console.log('Navigation to /auth successful');
    } catch (error) {
      console.error('Navigation failed:', error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to sign in page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsNavigating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const exampleTerms = ['mid', 'rizz', 'sus', 'bet'];
  
  return (
    <>
      <SEOHead 
        title="SlangLab - Evidence-Based Slang Decoder & Creator"
        description="Get evidence-based definitions with confidence scores, safety labels, and citations. Ideal for parents, teachers, and anyone navigating today's slang."
        keywords="slang decoder, modern slang dictionary, teen language, slang creator, confidence scores, safety labels, evidence-based definitions"
        structuredData={createWebsiteSchema()}
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SlangLab</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/lookup" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Decoder
              </Link>
              <Link to="/slang-lab" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Creator
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link to="/leaderboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Leaderboard
              </Link>
              {user && (
                <Link to="/account?tab=history" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  History
                </Link>
              )}
            </nav>
            
            <div className="flex items-center space-x-2">
              {/* Mobile Navigation */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center space-x-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      <span>SlangLab</span>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col space-y-4">
                    <Link 
                      to="/lookup" 
                      className="flex items-center space-x-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <Search className="h-5 w-5" />
                      <span>Decoder</span>
                    </Link>
                    <Link 
                      to="/slang-lab" 
                      className="flex items-center space-x-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Creator</span>
                    </Link>
                    <Link 
                      to="/pricing" 
                      className="flex items-center space-x-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Pricing</span>
                    </Link>
                    <Link 
                      to="/leaderboard" 
                      className="flex items-center space-x-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <Trophy className="h-5 w-5" />
                      <span>Leaderboard</span>
                    </Link>
                    {user && (
                      <Link 
                        to="/account?tab=history" 
                        className="flex items-center space-x-2 text-lg font-medium text-foreground hover:text-primary transition-colors"
                      >
                        <History className="h-5 w-5" />
                        <span>History</span>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account?tab=history')}>
                      <History className="mr-2 h-4 w-4" />
                      History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleSignInClick}
                  disabled={isNavigating}
                  className="relative"
                >
                  {isNavigating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main>
          <section className="container mx-auto px-4 py-16 text-center">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
                Decode Slang. Create Slang. Track the Trend.
              </h2>
              <p className="mb-8 text-xl text-muted-foreground">Type a word like rizz, mid, or sus. Get the meaning fast. Make your own slang and see if it spreads.</p>
              
              {/* Search Bar */}
              <div className="mb-8 w-full max-w-2xl mx-auto">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for slang terms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full h-12 pl-4 pr-12 text-lg"
                  />
                  <Button
                    onClick={handleSearch}
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Example Chips */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <span className="text-sm text-muted-foreground mr-2">Try:</span>
                  {exampleTerms.map((term) => (
                    <Badge
                      key={term}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => handleChipClick(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/lookup">
                    <Search className="mr-2 h-5 w-5" />
                    Decode a Slang
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg">
                  <Link to="/slang-lab">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create New Slang
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="container mx-auto px-4 py-16">
            <div className="grid gap-8 md:grid-cols-3">
              <article>
                <div className="p-6 text-center rounded-lg border">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Evidence-First</h3>
                  <p className="text-muted-foreground">
                    Every definition includes trusted citations and confidence scores based on credible sources.
                  </p>
                </div>
              </article>
              <article>
                <div className="p-6 text-center rounded-lg border">
                  <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Safety Labels</h3>
                  <p className="text-muted-foreground">
                    Clear tone indicators and warnings help you understand context and appropriateness.
                  </p>
                </div>
              </article>
              <article>
                <div className="p-6 text-center rounded-lg border">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Slang Creator</h3>
                  <p className="text-muted-foreground">
                    Generate fun, safe new phrases and explore the creative side of language evolution.
                  </p>
                </div>
              </article>
            </div>
          </section>

          {/* Trending Terms */}
          <section className="container mx-auto px-4 py-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Trending Slang</h2>
              <p className="text-muted-foreground">
                Most searched terms in the last 30 days
              </p>
              {lastUpdated && <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(lastUpdated).toLocaleDateString()}
                </p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {trendingTerms.map(item => 
                <Card key={item.term} className="cursor-pointer transition-colors hover:bg-accent" onClick={() => handleTermClick(item.term)}>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold mb-2">{item.term}</h3>
                    <div className="flex justify-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${item.confidence === 'High' ? 'bg-confidence-high text-white' : item.confidence === 'Medium' ? 'bg-confidence-medium text-white' : 'bg-confidence-low text-white'}`}>
                        {item.confidence}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${item.tone === 'positive' ? 'border-tone-positive text-tone-positive' : item.tone === 'neutral' ? 'border-tone-neutral text-tone-neutral' : item.tone === 'insulting' ? 'border-tone-insulting text-tone-insulting' : item.tone === 'adult' ? 'border-tone-adult text-tone-adult' : 'border-tone-niche text-tone-niche'}`}>
                        {item.tone}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-muted py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">How Confidence Scores Work</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Our evidence-based approach ensures you get reliable, trustworthy definitions
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="text-center">
                  <Badge className="mb-4 bg-confidence-high text-white">High Confidence</Badge>
                  <p className="text-sm text-muted-foreground">
                    3+ agreeing sources from credible dictionaries, published within 12 months
                  </p>
                </div>
                <div className="text-center">
                  <Badge className="mb-4 bg-confidence-medium text-white">Medium Confidence</Badge>
                  <p className="text-sm text-muted-foreground">
                    Mixed sources or older definitions, some uncertainty in meaning
                  </p>
                </div>
                <div className="text-center">
                  <Badge className="mb-4 bg-confidence-low text-white">Low Confidence</Badge>
                  <p className="text-sm text-muted-foreground">
                    Sparse or conflicting sources, emerging or uncertain usage
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy Note */}
          <section className="container mx-auto px-4 py-16">
            <article className="mx-auto max-w-2xl">
              <div className="p-6 text-center rounded-lg border">
                <Shield className="mx-auto mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  We don't store personal data in prompts or share your searches. 
                  Only citations and anonymized usage patterns are kept for quality improvement.
                </p>
              </div>
            </article>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 SlangLab. Decode today, create tomorrow.</p>
            {/* Alternative taglines - uncomment to use:
                © 2025 SlangLab. Where language evolution meets evidence.
                © 2025 SlangLab. Bridging generations through language.
                © 2025 SlangLab. Your trusted slang companion.
                Sl© 2025 angLab. Making slang accessible to everyone.
                © 2025 SlangLab. Decode the culture, create the future.
                © 2025 SlangLab. Evidence-based language exploration.
            */}
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;