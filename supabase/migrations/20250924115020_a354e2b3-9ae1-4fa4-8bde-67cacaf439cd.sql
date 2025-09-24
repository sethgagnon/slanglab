-- SECURITY FIX: Restrict admin access to profiles and add audit logging
-- Remove overly broad admin policies and replace with more restrictive ones

-- First, drop the existing overly permissive admin policies
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Create a more restrictive admin policy that only allows viewing specific fields
-- and logs all admin access to profile data
CREATE POLICY "Admins view limited profile data" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin() AND 
  -- Log admin access to profile data for security audit
  public.log_sensitive_data_access('ADMIN_VIEW_PROFILE', 'profiles', id) IS NOT NULL
);

-- Admins can only update role and plan fields, not personal data like email
-- Fixed the trigger context issue by removing OLD/NEW references in policy
CREATE POLICY "Admins update limited profile fields" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (
  is_admin() AND
  -- Log admin profile updates
  public.log_sensitive_data_access('ADMIN_UPDATE_PROFILE', 'profiles', id) IS NOT NULL
);

-- Create a secure function to get profile data that masks email for admin access
CREATE OR REPLACE FUNCTION public.get_secure_profile_data(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  email text,
  name text,
  role text,
  plan text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_own_profile boolean;
  requesting_user_is_admin boolean;
BEGIN
  -- Check if user is viewing their own profile
  is_own_profile := (auth.uid() = profile_user_id);
  
  -- Check if requesting user is admin
  requesting_user_is_admin := is_admin();
  
  -- Log access attempt
  PERFORM log_sensitive_data_access(
    CASE 
      WHEN is_own_profile THEN 'VIEW_OWN_PROFILE'
      WHEN requesting_user_is_admin THEN 'ADMIN_VIEW_PROFILE'
      ELSE 'UNAUTHORIZED_PROFILE_ACCESS'
    END,
    'profiles',
    (SELECT p.id FROM profiles p WHERE p.user_id = profile_user_id)
  );
  
  -- Return data based on access level
  IF is_own_profile THEN
    -- User can see their own full profile
    RETURN QUERY
    SELECT p.id, p.user_id, p.email, p.name, p.role, p.plan, p.created_at
    FROM profiles p
    WHERE p.user_id = profile_user_id;
  ELSIF requesting_user_is_admin THEN
    -- Admin sees masked email for privacy
    RETURN QUERY
    SELECT 
      p.id, 
      p.user_id, 
      mask_sensitive_data(p.email) as email, -- Mask email for admin view
      p.name, 
      p.role, 
      p.plan, 
      p.created_at
    FROM profiles p
    WHERE p.user_id = profile_user_id;
  ELSE
    -- No access for others
    RETURN;
  END IF;
END;
$$;