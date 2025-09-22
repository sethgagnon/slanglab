-- Fix search path security issues
-- Update functions to have immutable search paths

-- Fix the authentication validation function
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that auth.uid() is not null and the user exists in auth.users
  RETURN auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid()
  );
END;
$$;

-- Fix the audit profile access function
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log profile access for security monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    timestamp,
    success,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP || '_PROFILE',
    'profiles',
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE COALESCE(NEW.id, OLD.id)
    END,
    now(),
    true,
    inet_client_addr()
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;