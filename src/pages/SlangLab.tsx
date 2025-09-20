import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  User,
  LogOut,
  Loader2,
  CheckCircle,
  TrendingUp,
  PlusCircle,
  Trophy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SharePanel } from '@/components/SharePanel';
import { SlangMonitoringDashboard } from '@/components/SlangMonitoringDashboard';
import LeaderboardWidget from '@/components/LeaderboardWidget';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import { ManualSlangForm } from '@/components/ManualSlangForm';
import { ReportButton } from '@/components/ReportButton';
import { AgeVerificationModal } from '@/components/AgeVerificationModal';


interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  safe_flag: boolean;
  votes: number;
  creation_type?: string;
  vibe?: string;
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    isFromAI: boolean;
    message: string;
    canRetry: boolean;
  } | null>(null);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ai-create");
  const { plan, isAdmin } = useUsageStats();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasLabProAccess = isAdmin || plan === 'LabPro';

  // Fetch user profile and check age verification, and load existing creations
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_secure_user_profile', { target_user_id: user.id });

        if (!error && data && data.length > 0) {
          setUserProfile(data[0]);
          
          if (!data[0].age_verified) {
            setShowAgeVerification(true);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    const loadExistingCreations = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('creations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const mappedCreations = data.map(item => ({
            ...item,
            votes: 0 // Default votes for now
          }));
          setCreations(mappedCreations);
        }
      } catch (error) {
        console.error('Error loading existing creations:', error);
      }
    };

    fetchUserProfile();
    loadExistingCreations();
  }, [user]);

  const handleAgeVerificationComplete = (isMinor: boolean) => {
    setShowAgeVerification(false);
    setUserProfile(prev => ({ ...prev, age_verified: true, safe_mode: isMinor }));
    
    if (isMinor) {
      toast({
        title: 'Enhanced Safety Mode',
        description: 'Your account has enhanced content filtering for safety.',
      });
    }
  };

  const isLabPro = hasLabProAccess;

  // Function to refresh creations after manual creation
  const refreshCreations = async () => {
    try {
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map data to include votes as 0 for now (we'll implement voting separately)
        const mappedCreations = data.map(item => ({
          ...item,
          votes: 0 // Default votes for manual creations
        }));
        setCreations(mappedCreations);
      }
    } catch (error) {
      console.error('Error refreshing creations:', error);
    }
  };

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
    setGenerationStatus(null); // Clear previous status
    try {
      const { data, error } = await supabase.functions.invoke('generate-slang', {
        body: { vibe: selectedVibe }
      });

      if (error) {
        throw error;
      }

      const mockCreationsWithIds = data.creations.map((creation: any, index: number) => ({
        ...creation,
        id: `${Date.now()}_${index}`,
        votes: 0
      }));

      setCreations(mockCreationsWithIds);
      
      // Set generation status for user feedback
      setGenerationStatus({
        isFromAI: data.isFromAI || false,
        message: data.message || 'Slang generated successfully!',
        canRetry: data.canRetry || false
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Unable to generate new slang. Please try again.",
        variant: "destructive",
      });
    } finally {
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

    try {
      const { data, error } = await supabase.functions.invoke('vote-creation', {
        body: { 
          creationId,
          value
        }
      });

      if (error) {
        throw error;
      }

      setCreations(prev => prev.map(creation => 
        creation.id === creationId 
          ? { ...creation, votes: data.newScore }
          : creation
      ));

      toast({
        title: "Vote recorded",
        description: data.message || "Thanks for your feedback!",
      });
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error.message || "Unable to record vote.",
        variant: "destructive",
      });
    }
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
            Generate fun, safe new phrases and track them in the wild
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className={`grid w-full max-w-4xl mx-auto ${hasLabProAccess ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="ai-create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Create
            </TabsTrigger>
            <TabsTrigger value="manual-create" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Manual Create
            </TabsTrigger>
            {hasLabProAccess && (
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Slang Tracker
              </TabsTrigger>
            )}
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-create" className="space-y-8">
            {/* Generator Controls */}
            <Card className="mx-auto max-w-2xl">
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
                {/* Generation Status */}
                {generationStatus && (
                  <Card className="mx-auto max-w-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        {generationStatus.isFromAI ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50">
                            Fallback
                          </Badge>
                        )}
                        <p className="text-sm font-medium">{generationStatus.message}</p>
                        {generationStatus.canRetry && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGenerate}
                            disabled={loading}
                          >
                            Try Again
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <h2 className="text-xl font-semibold text-center">
                  {generationStatus?.isFromAI ? 'Fresh AI Creations' : 'Creative Slang Collection'}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {creations.map((creation) => (
                    <Card key={creation.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{creation.phrase}</CardTitle>
                          <div className="flex gap-1">
                            {creation.safe_flag && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Safe
                              </Badge>
                            )}
                            {generationStatus && !generationStatus.isFromAI && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                Curated
                              </Badge>
                            )}
                          </div>
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
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
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
                              <ReportButton 
                                contentType="creation" 
                                contentId={creation.id} 
                                size="sm" 
                              />
                            </div>
                          </div>

                          {/* Share Panel for LabPro users */}
                          {isLabPro && user && (
                            <div className="border-t border-border pt-3">
                              <p className="text-xs text-muted-foreground mb-2">Share your creation:</p>
                              <SharePanel 
                                creation={{
                                  id: creation.id,
                                  phrase: creation.phrase,
                                  meaning: creation.meaning,
                                  example: creation.example,
                                  vibe: selectedVibe,
                                  created_at: new Date().toISOString(),
                                  creation_type: 'ai'
                                }}
                                userId={user.id}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Notice */}
            <Card className="mx-auto max-w-2xl">
              <CardContent className="p-6 text-center">
                <CheckCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Safe Content Promise</h3>
                <p className="text-sm text-muted-foreground">
                  All generated phrases are filtered for safety and appropriateness. 
                  We never create offensive, harmful, or inappropriate content.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual-create" className="space-y-8">
            <div className="mx-auto max-w-2xl">
              <ManualSlangForm 
                onCreationSuccess={refreshCreations}
                disabled={!user}
              />
            </div>
          </TabsContent>

          {hasLabProAccess && (
            <TabsContent value="tracking">
              <SlangMonitoringDashboard />
            </TabsContent>
          )}
          
          <TabsContent value="leaderboard" className="space-y-6">
            <LeaderboardWidget 
              entries={[]}
              title="Top Creators This Week"
              showFullLeaderboard={true}
            />
          </TabsContent>
          
          {!hasLabProAccess && activeTab === "tracking" && (
            <div className="text-center p-8 space-y-4">
              <UpgradePrompt type="creation-limit" />
            </div>
          )}
        </Tabs>
      </div>

      {user && (
        <AgeVerificationModal
          open={showAgeVerification}
          onVerificationComplete={handleAgeVerificationComplete}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default SlangLab;