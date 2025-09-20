-- Remove SECURITY DEFINER from mask_sensitive_data function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
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
$$;