-- Fix security warning: Update function search path
CREATE OR REPLACE FUNCTION public.user_can_create_content(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  strike_count integer;
  severe_strikes integer;
BEGIN
  -- Count active strikes
  SELECT COUNT(*) INTO strike_count
  FROM user_strikes 
  WHERE user_id = user_uuid 
  AND (expires_at IS NULL OR expires_at > now());
  
  -- Count severe strikes
  SELECT COUNT(*) INTO severe_strikes
  FROM user_strikes 
  WHERE user_id = user_uuid 
  AND severity = 'severe'
  AND (expires_at IS NULL OR expires_at > now());
  
  -- Block if too many strikes
  IF severe_strikes >= 1 OR strike_count >= 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;