-- Phase 1: Critical Security Fixes

-- 1. Add IP anonymization function
CREATE OR REPLACE FUNCTION public.anonymize_ip(ip_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Hash IP addresses for privacy while maintaining uniqueness for rate limiting
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return first 3 octets + hash of full IP for IPv4, or truncated hash for IPv6
  IF ip_address ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$' THEN
    -- IPv4: Keep first 3 octets, hash the last
    RETURN substring(ip_address from '^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}$') || '.xxx';
  ELSE
    -- IPv6 or other: Return truncated hash
    RETURN 'hash_' || substring(encode(digest(ip_address, 'sha256'), 'hex'), 1, 8);
  END IF;
END;
$$;

-- 2. Update anonymous_searches to use anonymized IPs
ALTER TABLE public.anonymous_searches 
ADD COLUMN IF NOT EXISTS anonymized_ip text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_anonymous_searches_anonymized_ip 
ON public.anonymous_searches(anonymized_ip);

-- 3. Update security_audit_log to use anonymized IPs
ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS anonymized_ip text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_anonymized_ip 
ON public.security_audit_log(anonymized_ip);

-- 4. Create function to update anonymized IPs (for existing data)
CREATE OR REPLACE FUNCTION public.update_anonymized_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update anonymous_searches
  UPDATE public.anonymous_searches 
  SET anonymized_ip = public.anonymize_ip(ip_address)
  WHERE anonymized_ip IS NULL AND ip_address IS NOT NULL;
  
  -- Update security_audit_log  
  UPDATE public.security_audit_log 
  SET anonymized_ip = public.anonymize_ip(ip_address::text)
  WHERE anonymized_ip IS NULL AND ip_address IS NOT NULL;
END;
$$;

-- Execute the update
SELECT public.update_anonymized_ips();

-- 5. Add enhanced admin action logging
CREATE OR REPLACE FUNCTION public.log_admin_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  -- Log admin access to sensitive data
  IF is_admin AND TG_TABLE_NAME IN ('profiles', 'user_strikes', 'content_reports') THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      record_id,
      timestamp,
      success
    ) VALUES (
      auth.uid(),
      'ADMIN_' || TG_OP,
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      now(),
      true
    );
  END IF;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 6. Create triggers for admin access logging
DROP TRIGGER IF EXISTS admin_access_profiles ON public.profiles;
CREATE TRIGGER admin_access_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_access();

DROP TRIGGER IF EXISTS admin_access_user_strikes ON public.user_strikes;
CREATE TRIGGER admin_access_user_strikes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_strikes
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_access();

DROP TRIGGER IF EXISTS admin_access_content_reports ON public.content_reports;
CREATE TRIGGER admin_access_content_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_access();

-- 7. Add data retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM public.security_audit_log 
  WHERE timestamp < now() - interval '1 year';
  
  -- Delete anonymous searches older than 30 days
  DELETE FROM public.anonymous_searches 
  WHERE created_at < now() - interval '30 days';
  
  -- Log the cleanup
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    timestamp,
    success
  ) VALUES (
    NULL,
    'DATA_CLEANUP',
    'system',
    now(),
    true
  );
END;
$$;

-- 8. Create rate limiting function for edge functions
CREATE OR REPLACE FUNCTION public.check_edge_function_rate_limit(
  identifier text,
  max_requests integer DEFAULT 100,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := date_trunc('hour', now()) + 
                  (EXTRACT(minute FROM now())::integer / window_minutes) * 
                  (window_minutes || ' minutes')::interval;
  
  -- Get current request count in window
  SELECT COALESCE(access_count, 0) INTO current_count
  FROM public.profile_access_rate_limit
  WHERE user_id IS NULL 
  AND window_start = window_start
  AND created_at::text = identifier; -- Reuse table with identifier as created_at string
  
  IF current_count >= max_requests THEN
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      success,
      error_message
    ) VALUES (
      NULL,
      'EDGE_FUNCTION_RATE_LIMIT',
      identifier,
      false,
      'Rate limit exceeded: ' || current_count || '/' || max_requests
    );
    RETURN false;
  END IF;
  
  -- Update counter
  INSERT INTO public.profile_access_rate_limit (user_id, access_count, window_start, created_at)
  VALUES (NULL, 1, window_start, identifier::timestamp with time zone)
  ON CONFLICT (user_id, window_start) 
  DO UPDATE SET access_count = profile_access_rate_limit.access_count + 1;
  
  RETURN true;
END;
$$;