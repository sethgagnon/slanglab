-- Enhance source_rules table to support comprehensive API source management
ALTER TABLE public.source_rules 
ADD COLUMN IF NOT EXISTS source_name text,
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS domains_allowlist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS domains_blocklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '["en"]'::jsonb,
ADD COLUMN IF NOT EXISTS min_score integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS per_run_cap integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update existing status column to have better default
ALTER TABLE public.source_rules 
ALTER COLUMN status SET DEFAULT 'inactive';

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_source_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_source_rules_updated_at
  BEFORE UPDATE ON public.source_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_source_rules_updated_at();

-- Insert default API source configurations
INSERT INTO public.source_rules (source_name, source_type, domain, status, enabled, config) VALUES
('Google Custom Search', 'search_api', 'googleapis.com', 'inactive', true, '{"description": "Google Custom Search Engine for web results"}'),
('NewsAPI', 'news_api', 'newsapi.org', 'inactive', true, '{"description": "News aggregation service"}'),
('Reddit API', 'social_api', 'reddit.com', 'inactive', false, '{"description": "Reddit content search (Coming Soon)"}'),
('YouTube API', 'video_api', 'googleapis.com', 'inactive', false, '{"description": "YouTube video search (Coming Soon)"}')
ON CONFLICT (domain) DO NOTHING;