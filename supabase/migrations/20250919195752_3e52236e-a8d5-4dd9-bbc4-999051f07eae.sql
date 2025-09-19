-- Create search_sources table for managing external search sources
CREATE TABLE public.search_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  base_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  quality_score integer NOT NULL DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can read enabled sources (for search functionality)
CREATE POLICY "Anyone can view enabled sources" 
ON public.search_sources 
FOR SELECT 
USING (enabled = true);

-- Admins can view all sources
CREATE POLICY "Admins can view all sources" 
ON public.search_sources 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Admins can create sources
CREATE POLICY "Admins can create sources" 
ON public.search_sources 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Admins can update sources
CREATE POLICY "Admins can update sources" 
ON public.search_sources 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Admins can delete sources, but not required ones
CREATE POLICY "Admins can delete non-required sources" 
ON public.search_sources 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ) 
  AND is_required = false
);

-- Create updated_at trigger
CREATE TRIGGER update_search_sources_updated_at
  BEFORE UPDATE ON public.search_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add URL validation trigger
CREATE OR REPLACE FUNCTION public.validate_search_source_url()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic URL validation
  IF NEW.base_url !~ '^https?://' THEN
    RAISE EXCEPTION 'base_url must be a valid HTTP(S) URL';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_search_source_url_trigger
  BEFORE INSERT OR UPDATE ON public.search_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_search_source_url();

-- Seed required sources
INSERT INTO public.search_sources (name, base_url, enabled, is_required, quality_score, notes) VALUES
('UrbanDictionary', 'https://www.urbandictionary.com', true, true, 100, 'Primary slang dictionary'),
('TikTok', 'https://www.tiktok.com', true, true, 100, 'Social media platform for trending slang')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  is_required = EXCLUDED.is_required,
  quality_score = EXCLUDED.quality_score,
  notes = EXCLUDED.notes;