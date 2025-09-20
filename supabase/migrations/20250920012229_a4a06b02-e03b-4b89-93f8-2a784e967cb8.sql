-- Security Enhancement 4: Create data masking function for sensitive fields
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL OR length(input_text) = 0 THEN
    RETURN input_text;
  END IF;
  
  -- Mask all but first and last character for emails and names
  IF length(input_text) <= 2 THEN
    RETURN repeat('*', length(input_text));
  ELSE
    RETURN left(input_text, 1) || repeat('*', length(input_text) - 2) || right(input_text, 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Security Enhancement 5: Add rate limiting table for profile access
CREATE TABLE public.profile_access_rate_limit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  access_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, window_start)
);

-- Enable RLS on rate limit table
ALTER TABLE public.profile_access_rate_limit ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limit data" 
ON public.profile_access_rate_limit 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can manage rate limit data
CREATE POLICY "System can manage rate limit data" 
ON public.profile_access_rate_limit 
FOR ALL 
USING (auth.uid() IS NOT NULL);