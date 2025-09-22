-- Fix source name mismatches to enable proper tracker functionality

-- Update the Google Custom Search source rule to use the correct source_name
UPDATE public.source_rules 
SET source_name = 'google_cse'
WHERE source_name = 'Google Custom Search' OR domain = 'google_cse';

-- Update the SerpAPI source rule to use the correct source_name (if needed)
UPDATE public.source_rules 
SET source_name = 'SerpAPI'
WHERE source_name = 'NewsAPI' OR domain = 'SerpAPI' OR source_type = 'news';

-- Update tracker configurations to use the correct source names
UPDATE public.trackers 
SET sources_enabled = jsonb_build_array('google_cse', 'SerpAPI')
WHERE sources_enabled::text LIKE '%Google Custom Search%' 
   OR sources_enabled::text LIKE '%NewsAPI%';

-- Ensure domains_allowlist is empty array to enable full web search
UPDATE public.source_rules 
SET domains_allowlist = '[]'::jsonb
WHERE domains_allowlist IS NULL OR domains_allowlist = 'null'::jsonb;