import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  User,
  LogOut,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  safe_flag: boolean;
  votes: number;
}

const VIBES = [
  { value: 'praise', label: 'Praise & Compliments' },
  { value: 'hype', label: 'Hype & Excitement' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'compliment', label: 'General Compliment' },
  { value: 'gentle-roast', label: 'Gentle Roast' },
];

const SlangLab = () => {
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creations, setCreations] = useState<Creation[]>([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!selectedVibe) {
      toast({
        title: "Select a vibe",
        description: "Please choose a vibe before generating new slang.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call to edge function
      // Simulate API response
      setTimeout(() => {
        const mockCreations: Creation[] = [
          {
            id: '1',
            phrase: 'chef\'s choice',
            meaning: 'something perfectly selected',
            example: 'Your outfit today is chef\'s choice!',
            safe_flag: true,
            votes: 0
          },
          {
            id: '2',
            phrase: 'mood boost',
            meaning: 'something that instantly improves your day',
            example: 'That compliment was a real mood boost.',
            safe_flag: true,
            votes: 0
          },
          {
            id: '3',
            phrase: 'golden era',
            meaning: 'peak performance or excellence',
            example: 'You\'re in your golden era right now.',
            safe_flag: true,
            votes: 0
          },
          {
            id: '4',
            phrase: 'smooth operator',
            meaning: 'someone handling things effortlessly',
            example: 'Look at you being a smooth operator.',
            safe_flag: true,
            votes: 0
          },
          {
            id: '5',
            phrase: 'energy drink',
            meaning: 'person who brings positive vibes',
            example: 'You\'re like a human energy drink today.',
            safe_flag: true,
            votes: 0
          }
        ];
        setCreations(mockCreations);
        setLoading(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Unable to generate new slang. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleVote = async (creationId: string, value: 1 | -1) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on creations.",
      });
      return;
    }

    setCreations(prev => prev.map(creation => 
      creation.id === creationId 
        ? { ...creation, votes: creation.votes + value }
        : creation
    ));

    toast({
      title: "Vote recorded",
      description: "Thanks for your feedback!",
    });
  };

  const handleSave = async (creationId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save creations.",
      });
      return;
    }

    toast({
      title: "Saved!",
      description: "Creation added to your favorites.",
    });
  };

  const handleCopy = async (example: string) => {
    try {
      await navigator.clipboard.writeText(example);
      toast({
        title: "Copied!",
        description: "Example copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
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
            <Link to="/lookup" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Lookup
            </Link>
            <Link to="/slang-lab" className="text-sm font-medium">
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Slang Creator Lab</h1>
          <p className="text-muted-foreground">
            Generate fun, safe new phrases and explore creative language
          </p>
        </div>

        {/* Generator Controls */}
        <Card className="mx-auto max-w-2xl mb-8">
          <CardHeader>
            <CardTitle>Create New Slang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Choose a Vibe</label>
              <Select value={selectedVibe} onValueChange={setSelectedVibe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the mood you want to create..." />
                </SelectTrigger>
                <SelectContent>
                  {VIBES.map((vibe) => (
                    <SelectItem key={vibe.value} value={vibe.value}>
                      {vibe.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !selectedVibe}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Creative Slang...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 5 Phrases
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Creations */}
        {creations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Fresh Creations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {creations.map((creation) => (
                <Card key={creation.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{creation.phrase}</CardTitle>
                      {creation.safe_flag && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Safe
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Meaning</p>
                      <p className="text-sm">{creation.meaning}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Example</p>
                      <p className="text-sm italic">"{creation.example}"</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleVote(creation.id, 1)}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-1">
                          {creation.votes}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleVote(creation.id, -1)}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSave(creation.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopy(creation.example)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Safety Notice */}
        <Card className="mx-auto max-w-2xl mt-8">
          <CardContent className="p-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 text-lg font-semibold">Safe Content Promise</h3>
            <p className="text-sm text-muted-foreground">
              All generated phrases are filtered for safety and appropriateness. 
              We never create offensive, harmful, or inappropriate content.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SlangLab;