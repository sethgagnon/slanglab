import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { ShareTrackModal } from '@/components/ShareTrackModal';
import type { Creation as ShareCreation } from '@/hooks/useCreations';
import { SlangMonitoringDashboard } from '@/components/SlangMonitoringDashboard';
import LeaderboardWidget from '@/components/LeaderboardWidget';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import { ApproachingLimitBanner } from '@/components/ui/approaching-limit-banner';
import { SmartUpgradeCta } from '@/components/ui/smart-upgrade-cta';
import { SoftGatePrompt } from '@/components/ui/soft-gate-prompt';
import { FeatureDisclosure } from '@/components/ui/feature-disclosure';
import { TimeBasedPrompt } from '@/components/ui/time-based-prompt';
import { SmartSegmentationCta } from '@/components/ui/smart-segmentation-cta';
import { TrialOffer } from '@/components/ui/trial-offer';
import { ManualSlangForm } from '@/components/ManualSlangForm';
import { ReportButton } from '@/components/ReportButton';
import { AgeVerificationModal } from '@/components/AgeVerificationModal';
import type { AgeBand, ContentFormat, ContentContext } from '@/types/slang';
import { getAgePolicyForBand, getAgeBandDisplay, filterVibesForAge, getSharingConfig } from '@/lib/agePolicy';


interface Creation {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  usage_examples?: string[];
  part_of_speech?: string;
  notes_for_moderator?: string;
  safe_flag: boolean;
  votes: number;
  creation_type?: string;
  vibe?: string;
  created_at: string;
}

const VIBES = [
  { value: 'hype', label: 'Hype' },
  { value: 'chill', label: 'Chill' },
  { value: 'goofy', label: 'Goofy' },
  { value: 'try-hard', label: 'Try-hard' },
  { value: 'academic', label: 'Academic' },
  { value: 'gamer', label: 'Gamer' },
  { value: 'artsy', label: 'Artsy' },
  { value: 'sportsy', label: 'Sportsy' },
];

const CONTEXTS = [
  { value: 'food', label: 'Food' },
  { value: 'homework', label: 'Homework' },
  { value: 'sports', label: 'Sports' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'inside-joke', label: 'Inside Joke' },
  { value: 'generic', label: 'Generic' },
];

const FORMATS = [
  { value: 'word', label: 'Single Word' },
  { value: 'short_phrase', label: 'Short Phrase' },
  { value: 'emoji_word_mash', label: 'Emoji + Words' },
];

// Phase 3: Form Presets
const FORM_PRESETS = [
  {
    name: 'Study Squad',
    vibes: ['academic', 'goofy'],
    context: 'homework' as ContentContext,
    format: 'short_phrase' as ContentFormat
  },
  {
    name: 'Gamers',
    vibes: ['gamer', 'hype'],
    context: 'gaming' as ContentContext,
    format: 'word' as ContentFormat
  },
  {
    name: 'Theater Kids',
    vibes: ['artsy', 'goofy'],
    context: 'generic' as ContentContext,
    format: 'emoji_word_mash' as ContentFormat
  }
];

const SlangLab = () => {
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState('generic');
  const [selectedFormat, setSelectedFormat] = useState('short_phrase');
  const [loading, setLoading] = useState(false);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [creationToShare, setCreationToShare] = useState<ShareCreation | null>(null);
  
  // Phase 1: Age Controls State
  const [ageBand, setAgeBand] = useState<AgeBand>('11-13');
  const [schoolSafe, setSchoolSafe] = useState(true);
  const [creativity, setCreativity] = useState(0.7);
  
  // Phase 3: Form Presets State
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<{
    isFromAI: boolean;
    message: string;
    canRetry: boolean;
  } | null>(null);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ai-create");
  const { 
    plan, 
    isAdmin, 
    searchesUsed, 
    searchesLimit, 
    aiCreationsUsed, 
    aiCreationsLimit,
    manualCreationsUsed,
    manualCreationsLimit 
  } = useUsageStats();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasLabProAccess = isAdmin || plan === 'LabPro';
  
  // Get age policy and filtered vibes
  const agePolicy = getAgePolicyForBand(ageBand);
  const availableVibes = filterVibesForAge(VIBES, ageBand);
  const sharingConfig = getSharingConfig(ageBand);

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
          } else {
            // Set age band based on birth date if available
            if (data[0].birth_date) {
              const birthDate = new Date(data[0].birth_date);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              if (age >= 11 && age <= 13) setAgeBand('11-13');
              else if (age >= 14 && age <= 17) setAgeBand('14-17');
              else if (age >= 18 && age <= 22) setAgeBand('18-22');
              else setAgeBand(age < 11 ? '11-13' : '18-22');
            }
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
    
    // Update age band based on verification
    if (userProfile?.birth_date) {
      const birthDate = new Date(userProfile.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age >= 11 && age <= 13) setAgeBand('11-13');
      else if (age >= 14 && age <= 17) setAgeBand('14-17');
      else if (age >= 18 && age <= 22) setAgeBand('18-22');
      else setAgeBand(age < 11 ? '11-13' : '18-22');
    }
    
    if (isMinor) {
      toast({
        title: 'Enhanced Safety Mode',
        description: 'Your account has enhanced content filtering for safety.',
      });
    }
  };

  const isLabPro = hasLabProAccess;

  // Function to refresh creations after manual creation
  // Phase 3: Form Preset Handlers
  const applyPreset = (preset: typeof FORM_PRESETS[0]) => {
    const policy = getAgePolicyForBand(ageBand);
    
    // Filter vibes for age
    const allowedVibes = preset.vibes.filter(vibe => 
      availableVibes.some(av => av.value === vibe)
    );
    
    // Check if format is allowed
    const allowedFormat = policy.allowedFormats.includes(preset.format) ? 
      preset.format : policy.allowedFormats[0];
    
    // Check if context is allowed
    const allowedContext = policy.allowedContexts.includes(preset.context) ? 
      preset.context : 'generic';
    
    setSelectedVibes(allowedVibes);
    setSelectedContext(allowedContext);
    setSelectedFormat(allowedFormat);
    setActivePreset(preset.name);
    
    toast({
      title: `${preset.name} preset applied!`,
      description: "Your form has been updated with the preset values.",
    });
  };

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
    if (selectedVibes.length === 0) {
      toast({
        title: "Select at least one vibe",
        description: "Please choose at least one vibe before generating new slang.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGenerationStatus(null); // Clear previous status
    try {
      const { data, error } = await supabase.functions.invoke('generate-slang', {
        body: { 
          vibeTags: selectedVibes,
          context: selectedContext,
          format: selectedFormat,
          ageBand,
          schoolSafe,
          creativity
        }
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
        
        // Show trial offer for limit errors if eligible
        if (error.message?.includes('limit') || error.message?.includes('quota')) {
          setGenerationStatus({
            isFromAI: false,
            message: 'limit_reached', // Special flag for trial offer
            canRetry: false
          });
        } else {
          setGenerationStatus({
            isFromAI: false,
            message: error.message,
            canRetry: false
          });
          
          toast({
            title: "Generation failed",
            description: error.message || "Unable to generate new slang. Please try again.",
            variant: "destructive",
          });
        }
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
              <Link to="/account?tab=history" className="text-sm font-medium text-muted-foreground hover:text-foreground">
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

        {/* Time-Based Offers */}
        <div className="max-w-4xl mx-auto mb-6">
          <TimeBasedPrompt plan={plan} variant="banner" />
        </div>

        {/* Usage Alerts & Soft Gates */}
        <div className="max-w-4xl mx-auto mb-6 space-y-3">
          {/* Soft gates (show before hitting limits) */}
          <SoftGatePrompt 
            type="search-warning"
            remaining={searchesLimit - searchesUsed}
            plan={plan}
          />
          <SoftGatePrompt 
            type="ai-creation-warning"
            remaining={aiCreationsLimit - aiCreationsUsed}
            plan={plan}
          />
          <SoftGatePrompt 
            type="manual-creation-warning"
            remaining={manualCreationsLimit - manualCreationsUsed}
            plan={plan}
          />
          
          {/* Hard limit banners (show when approaching/at limits) */}
          <ApproachingLimitBanner 
            usedCount={searchesUsed} 
            totalLimit={searchesLimit} 
            limitType="searches" 
            plan={plan}
          />
          <ApproachingLimitBanner 
            usedCount={aiCreationsUsed} 
            totalLimit={aiCreationsLimit} 
            limitType="ai-creations" 
            plan={plan}
          />
          <ApproachingLimitBanner 
            usedCount={manualCreationsUsed} 
            totalLimit={manualCreationsLimit} 
            limitType="manual-creations" 
            plan={plan}
          />
        </div>

        {/* Smart Segmentation CTA */}
        {plan === 'Free' && (
          <div className="max-w-4xl mx-auto mb-6">
            <SmartSegmentationCta 
              usage={{
                searchesUsed,
                searchesLimit,
                aiCreationsUsed,
                aiCreationsLimit,
                manualCreationsUsed,
                manualCreationsLimit,
                plan
              }}
              variant="inline"
            />
          </div>
        )}

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
              <CardContent className="space-y-6">
                {/* Age Band Display (Read-only) */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Age Group</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{getAgeBandDisplay(ageBand)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on your profile information. Content is tailored for your age group.
                    </p>
                  </div>
                </div>

                {/* Phase 3: Form Presets */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quick Presets</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {FORM_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant={activePreset === preset.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="text-xs"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Phase 3: Enhanced School-Safe Toggle (18-22 only) */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">School-Safe Mode</label>
                    <p className="text-xs text-muted-foreground">
                      {ageBand === '18-22' 
                        ? 'Optional - content suitable for academic/work environments' 
                        : 'Required for your age group'
                      }
                    </p>
                    <p className="text-xs text-primary mt-1">Be kind. No hate. No harm.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="school-safe"
                      checked={schoolSafe}
                      onChange={(e) => setSchoolSafe(e.target.checked)}
                      disabled={ageBand !== '18-22'}
                      className="rounded border-border"
                    />
                    <label htmlFor="school-safe" className="text-sm">
                      {schoolSafe ? 'ON' : 'OFF'}
                    </label>
                  </div>
                </div>

                {/* Creativity Level Slider */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Creativity Level: {creativity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max={agePolicy.maxCreativity}
                    step="0.1"
                    value={creativity}
                    onChange={(e) => setCreativity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative</span>
                    <span>Max: {agePolicy.maxCreativity}</span>
                  </div>
                </div>

                {/* Multi-Vibe Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Choose Vibes (1-3)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableVibes.map((vibe) => (
                      <Chip
                        key={vibe.value}
                        selected={selectedVibes.includes(vibe.value)}
                        onClick={() => {
                          if (selectedVibes.includes(vibe.value)) {
                            setSelectedVibes(selectedVibes.filter(v => v !== vibe.value));
                          } else if (selectedVibes.length < 3) {
                            setSelectedVibes([...selectedVibes, vibe.value]);
                          }
                        }}
                      >
                        {vibe.label}
                      </Chip>
                    ))}
                  </div>
                  {selectedVibes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {selectedVibes.length}/3
                    </p>
                  )}
                </div>

                {/* Context Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Context</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXTS.filter(context => agePolicy.allowedContexts.includes(context.value as any)).map((context) => (
                      <Chip
                        key={context.value}
                        selected={selectedContext === context.value}
                        onClick={() => setSelectedContext(context.value)}
                      >
                        {context.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Format Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Format</label>
                  <RadioGroup 
                    value={selectedFormat} 
                    onValueChange={setSelectedFormat}
                    className="flex flex-wrap gap-4"
                  >
                    {FORMATS.filter(format => agePolicy.allowedFormats.includes(format.value as any)).map((format) => (
                      <div key={format.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={format.value} id={format.value} />
                        <Label htmlFor={format.value} className="cursor-pointer">
                          {format.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading || selectedVibes.length === 0}
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
                      Generate Safe Slang
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
                      {generationStatus.message === 'limit_reached' ? (
                        <TrialOffer 
                          recommendedPlan={aiCreationsUsed >= aiCreationsLimit ? 'LabPro' : 'SearchPro'}
                          trigger="limit_reached"
                          variant="card"
                          onTrialStart={() => setGenerationStatus(null)}
                        />
                      ) : generationStatus.message?.includes('limit') || generationStatus.message?.includes('quota') ? (
                        <UpgradePrompt 
                          type="creation-limit" 
                          className="border-0 shadow-none p-0"
                          showStreamlined={true}
                        />
                      ) : (
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
                      )}
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

                          {/* Share & Track for LabPro users */}
                          {isLabPro && user && (
                            <div className="border-t border-border pt-3">
                              <p className="text-xs text-muted-foreground mb-2">Share your creation:</p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setCreationToShare({
                                    id: creation.id,
                                    phrase: creation.phrase,
                                    meaning: creation.meaning,
                                    example: creation.example,
                                    vibe: selectedVibes.join(', '),
                                    created_at: new Date().toISOString(),
                                    creation_type: 'ai'
                                  } as ShareCreation);
                                  setShareModalOpen(true);
                                }}
                                className="w-full"
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Share & Track
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Smart Upgrade CTA after successful creation */}
                {generationStatus?.isFromAI && plan === 'Free' && (
                  <div className="max-w-2xl mx-auto">
                    <SmartUpgradeCta 
                      context="success-creation" 
                      plan={plan} 
                    />
                  </div>
                )}
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
      
      {/* Share & Track Modal */}
      {creationToShare && user && (
        <ShareTrackModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) setCreationToShare(null);
          }}
          creation={creationToShare}
          userId={user.id}
          hasLabProAccess={hasLabProAccess}
        />
      )}
    </div>
  );
};

export default SlangLab;