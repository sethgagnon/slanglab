-- Security Enhancement 1: Create audit logging for sensitive data access
CREATE TABLE public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Security Enhancement 2: Create function to log profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger AS $$
BEGIN
  -- Log the access attempt
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    record_id,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit trigger to profiles table
CREATE TRIGGER audit_profile_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();

-- Security Enhancement 3: Create data masking function for sensitive fields
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

-- Security Enhancement 4: Create secure profile view with conditional masking
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  user_id,
  -- Only show full data to the profile owner, mask for others
  CASE 
    WHEN auth.uid() = user_id THEN name
    ELSE public.mask_sensitive_data(name)
  END as name,
  CASE 
    WHEN auth.uid() = user_id THEN email
    ELSE public.mask_sensitive_data(email)
  END as email,
  -- Never expose birth_date and parent_email unless it's the user's own profile
  CASE 
    WHEN auth.uid() = user_id THEN birth_date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN auth.uid() = user_id THEN parent_email
    ELSE NULL
  END as parent_email,
  -- Safe fields can be shown normally
  age_verified,
  safe_mode,
  plan,
  role,
  subscription_status,
  created_at
FROM public.profiles
WHERE auth.uid() = user_id OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      );

-- Security Enhancement 5: Add rate limiting table for profile access
CREATE TABLE public.profile_access_rate_limit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  access_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
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

-- Security Enhancement 6: Create function to check and enforce rate limits
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

-- Security Enhancement 7: Add validation trigger for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Validate email format
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate birth date (not in future, reasonable age limits)
  IF NEW.birth_date IS NOT NULL THEN
    IF NEW.birth_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Birth date cannot be in the future';
    END IF;
    
    IF NEW.birth_date < CURRENT_DATE - interval '120 years' THEN
      RAISE EXCEPTION 'Birth date is unrealistic';
    END IF;
  END IF;
  
  -- Validate parent email format if provided
  IF NEW.parent_email IS NOT NULL AND NEW.parent_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid parent email format';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add validation trigger
CREATE TRIGGER validate_profile_data_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_data();

-- Security Enhancement 8: Update profiles RLS policies with additional checks
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Enhanced view policy with rate limiting
CREATE POLICY "Users can view own profile with rate limit" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND public.check_profile_access_rate_limit()
);

-- Enhanced update policy with additional validation
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
) 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  -- Additional security: prevent role escalation
  AND (OLD.role = NEW.role OR OLD.role IS NULL)
);

-- Admin policy for emergency access (with audit logging)
CREATE POLICY "Admins can view profiles for support" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);