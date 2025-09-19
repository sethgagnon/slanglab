-- Fix search path for security
CREATE OR REPLACE FUNCTION public.validate_search_source_url()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic URL validation
  IF NEW.base_url !~ '^https?://' THEN
    RAISE EXCEPTION 'base_url must be a valid HTTP(S) URL';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;