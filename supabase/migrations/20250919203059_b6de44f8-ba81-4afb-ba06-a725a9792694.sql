-- Add Reddit as a source for testing
INSERT INTO search_sources (name, base_url, enabled, quality_score, is_required, notes) 
VALUES ('Reddit', 'https://www.reddit.com', true, 75, false, 'Community discussions and slang definitions')
ON CONFLICT (name) DO NOTHING;