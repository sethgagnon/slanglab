-- Update NewsAPI source rule to SerpAPI
UPDATE source_rules 
SET 
  source_name = 'SerpAPI',
  domain = 'serpapi.com',
  source_type = 'search_api',
  updated_at = now()
WHERE source_name = 'NewsAPI' OR source_name = 'news_api';