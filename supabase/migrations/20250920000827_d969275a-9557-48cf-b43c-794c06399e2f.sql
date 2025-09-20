-- Create leaderboards table for tracking user rankings
CREATE TABLE public.leaderboards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  period_type text NOT NULL DEFAULT 'all_time', -- 'all_time', 'weekly', 'monthly'
  period_start date,
  period_end date,
  viral_score integer NOT NULL DEFAULT 0,
  trending_count integer NOT NULL DEFAULT 0,
  spotted_count integer NOT NULL DEFAULT 0,
  platform_count integer NOT NULL DEFAULT 0,
  total_votes integer NOT NULL DEFAULT 0,
  rank_position integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create achievements table for tracking user accomplishments
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_type text NOT NULL, -- 'first_viral', 'cross_platform_king', 'vibe_master', etc.
  achievement_data jsonb DEFAULT '{}',
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create creator_stats table for aggregated user statistics
CREATE TABLE public.creator_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_creations integer NOT NULL DEFAULT 0,
  total_viral_score integer NOT NULL DEFAULT 0,
  best_creation_id uuid,
  favorite_vibe text,
  days_active integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboards
CREATE POLICY "Anyone can view public leaderboards" 
ON public.leaderboards 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM creator_stats cs 
  WHERE cs.user_id = leaderboards.user_id 
  AND cs.is_public = true
));

CREATE POLICY "Users can view their own leaderboard data" 
ON public.leaderboards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage leaderboard data" 
ON public.leaderboards 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for achievements
CREATE POLICY "Anyone can view public achievements" 
ON public.achievements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM creator_stats cs 
  WHERE cs.user_id = achievements.user_id 
  AND cs.is_public = true
));

CREATE POLICY "Users can view their own achievements" 
ON public.achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements" 
ON public.achievements 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for creator_stats
CREATE POLICY "Anyone can view public creator stats" 
ON public.creator_stats 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own stats" 
ON public.creator_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.creator_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stats" 
ON public.creator_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_leaderboards_user_period ON public.leaderboards(user_id, period_type, period_start);
CREATE INDEX idx_leaderboards_rank ON public.leaderboards(period_type, rank_position);
CREATE INDEX idx_achievements_user ON public.achievements(user_id);
CREATE INDEX idx_creator_stats_score ON public.creator_stats(total_viral_score DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_leaderboards_updated_at
BEFORE UPDATE ON public.leaderboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_stats_updated_at
BEFORE UPDATE ON public.creator_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();