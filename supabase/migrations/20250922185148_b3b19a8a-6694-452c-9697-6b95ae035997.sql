-- Fix security vulnerability in profiles table RLS policies
-- Remove the overly broad "deny anonymous" policy and implement proper security

-- First, drop the existing problematic policy
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create a comprehensive authentication validation function for profiles
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

-- Create secure policies with proper authentication validation
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_authenticated_user() AND auth.uid() = user_id)
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (is_authenticated_user() AND auth.uid() = user_id);

-- Add admin-only access policy for profile management
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_authenticated_user() AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (is_authenticated_user() AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add audit logging for profile access
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

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_profile_access_trigger ON public.profiles;
CREATE TRIGGER audit_profile_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();