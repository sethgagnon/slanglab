-- Complete the security fix by adding email protection trigger and secure admin function

-- Create a trigger to prevent admins from modifying email addresses
CREATE OR REPLACE FUNCTION public.prevent_admin_email_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is admin and trying to update someone else's profile
  IF is_admin() AND auth.uid() != NEW.user_id THEN
    -- Prevent email changes by admins
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      RAISE EXCEPTION 'Admins cannot modify user email addresses. Email changes must be done by the user themselves.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the email protection trigger only if it doesn't exist
DROP TRIGGER IF EXISTS prevent_admin_email_modification ON public.profiles;
CREATE TRIGGER prevent_admin_email_modification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_email_changes();

-- Create a secure function to get masked profile data for admins
CREATE OR REPLACE FUNCTION public.get_admin_safe_profile_data(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  email_masked text,
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
  requesting_user_is_admin boolean;
BEGIN
  -- Check if requesting user is admin
  requesting_user_is_admin := is_admin();
  
  -- Only proceed if user is admin
  IF NOT requesting_user_is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Log admin access attempt
  PERFORM log_sensitive_data_access('ADMIN_VIEW_PROFILE_SAFE', 'profiles', 
    (SELECT p.id FROM profiles p WHERE p.user_id = profile_user_id));
  
  -- Return profile data with masked email
  RETURN QUERY
  SELECT 
    p.id, 
    p.user_id, 
    mask_sensitive_data(p.email) as email_masked,
    p.name, 
    p.role, 
    p.plan, 
    p.created_at
  FROM profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;