-- Add smart caching tables for slang generation optimization

-- Cache table for storing generated content
CREATE TABLE public.slang_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe text NOT NULL,
  phrases jsonb NOT NULL, -- Array of phrase objects with phrase, meaning, example
  quality_score integer DEFAULT 0,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT now() + interval '1 hour'
);

-- User generation preferences for cache behavior
CREATE TABLE public.user_generation_preferences (
  user_id uuid PRIMARY KEY,
  cache_preference text DEFAULT 'balanced', -- 'fresh', 'balanced', 'economical'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_slang_cache_vibe_expires ON public.slang_cache(vibe, expires_at);
CREATE INDEX idx_slang_cache_quality ON public.slang_cache(quality_score DESC);

-- Enable RLS
ALTER TABLE public.slang_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_generation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for slang_cache
CREATE POLICY "Anyone can view cache entries" ON public.slang_cache
  FOR SELECT USING (true);

CREATE POLICY "System can manage cache entries" ON public.slang_cache
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for user_generation_preferences  
CREATE POLICY "Users can manage their own preferences" ON public.user_generation_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.slang_cache 
  WHERE expires_at < now();
END;
$$;