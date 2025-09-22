-- Temporarily lower score threshold for debugging

-- Update minimum score threshold to 10 for google_cse
UPDATE public.source_rules 
SET min_score = 10
WHERE source_name = 'google_cse';

-- Update minimum score threshold to 10 for SerpAPI  
UPDATE public.source_rules 
SET min_score = 10
WHERE source_name = 'SerpAPI';

-- Clean up any source rules with null source names
DELETE FROM public.source_rules 
WHERE source_name IS NULL;