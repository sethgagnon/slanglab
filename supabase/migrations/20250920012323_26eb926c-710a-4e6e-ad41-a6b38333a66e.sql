-- Create function to check and enforce rate limits (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit()
RETURNS boolean AS $$
DECLARE
  current_count integer;
  rate_limit integer := 100; -- Max 100 profile accesses per hour
BEGIN
  -- Get current access count in the last hour
  SELECT COALESCE(SUM(access_count), 0)
  INTO current_count
  FROM public.profile_access_rate_limit
  WHERE user_id = auth.uid()
  AND window_start > now() - interval '1 hour';
  
  -- Check if under limit
  IF current_count >= rate_limit THEN
    -- Log the rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      success,
      error_message
    ) VALUES (
      auth.uid(),
      'RATE_LIMIT_EXCEEDED',
      'profiles',
      false,
      'Profile access rate limit exceeded'
    );
    RETURN false;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.profile_access_rate_limit (user_id, access_count, window_start)
  VALUES (auth.uid(), 1, date_trunc('hour', now()))
  ON CONFLICT (user_id, window_start) 
  DO UPDATE SET access_count = profile_access_rate_limit.access_count + 1;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;