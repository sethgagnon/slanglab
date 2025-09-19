import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { useTrendingTerms } from '@/hooks/useTrendingTerms';

const DEMO_TERMS = [
  { term: 'mid', confidence: 'High', tone: 'neutral' },
  { term: 'rizz', confidence: 'High', tone: 'positive' },
  { term: 'delulu', confidence: 'Medium', tone: 'niche' },
  { term: 'lowkey', confidence: 'High', tone: 'neutral' },
  { term: 'gyat', confidence: 'Medium', tone: 'adult' },
  { term: 'girl dinner', confidence: 'High', tone: 'neutral' },
  { term: 'ratio', confidence: 'High', tone: 'neutral' },
  { term: 'sigma', confidence: 'Medium', tone: 'niche' },
  { term: 'skibidi', confidence: 'Low', tone: 'niche' },
  { term: 'the ick', confidence: 'High', tone: 'insulting' }
];

const Landing = () => {
  const navigate = useNavigate();
  const { trendingTerms, lastUpdated } = useTrendingTerms();

  const handleTermClick = (term: string) => {
    navigate(`/lookup?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">SlangLab</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/lookup">Start Decoding</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Real-Time Slang
            <span className="text-primary"> Decoder</span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Get evidence-based definitions with confidence scores, safety labels, and trusted citations. 
            Perfect for parents, teachers, and anyone navigating modern language.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link to="/lookup">
                <Search className="mr-2 h-5 w-5" />
                Decode Slang Now
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
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">Evidence-First</h3>
              <p className="text-muted-foreground">
                Every definition includes trusted citations and confidence scores based on credible sources.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">Safety Labels</h3>
              <p className="text-muted-foreground">
                Clear tone indicators and warnings help you understand context and appropriateness.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">Slang Creator</h3>
              <p className="text-muted-foreground">
                Generate fun, safe new phrases and explore the creative side of language evolution.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trending Terms */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Trending Slang</h2>
          <p className="text-muted-foreground">
            Most searched terms in the last 30 days
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {trendingTerms.map((item) => (
            <Card 
              key={item.term} 
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => handleTermClick(item.term)}
            >
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold mb-2">{item.term}</h3>
                <div className="flex justify-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      item.confidence === 'High' ? 'bg-confidence-high text-white' :
                      item.confidence === 'Medium' ? 'bg-confidence-medium text-white' :
                      'bg-confidence-low text-white'
                    }`}
                  >
                    {item.confidence}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      item.tone === 'positive' ? 'border-tone-positive text-tone-positive' :
                      item.tone === 'neutral' ? 'border-tone-neutral text-tone-neutral' :
                      item.tone === 'insulting' ? 'border-tone-insulting text-tone-insulting' :
                      item.tone === 'adult' ? 'border-tone-adult text-tone-adult' :
                      'border-tone-niche text-tone-niche'
                    }`}
                  >
                    {item.tone}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
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
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 text-lg font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              We don't store personal data in prompts or share your searches. 
              Only citations and anonymized usage patterns are kept for quality improvement.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 SlangLab. Made for safer, smarter language understanding.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;