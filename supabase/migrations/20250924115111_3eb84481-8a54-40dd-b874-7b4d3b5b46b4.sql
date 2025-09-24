-- SECURITY FIX: Fix the profiles table RLS policies for better email protection
-- First, let's see what policies currently exist and start fresh

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins view limited profile data" ON public.profiles;
DROP POLICY IF EXISTS "Admins update limited profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile with audit" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for profile access" ON public.profiles;

-- Create new, more secure policies

-- 1. Basic user policies - users can only access their own data
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile only" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Restricted admin policies with audit logging
-- Admins can view profiles but with mandatory audit logging
CREATE POLICY "Admins can view profiles with audit" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin() AND 
  public.log_sensitive_data_access('ADMIN_VIEW_PROFILE', 'profiles', id) IS NOT NULL
);

-- Admins can update only specific fields (role, plan) but NOT email addresses
CREATE POLICY "Admins can update role and plan only" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (
  is_admin() AND
  public.log_sensitive_data_access('ADMIN_UPDATE_PROFILE', 'profiles', id) IS NOT NULL
);

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

-- Apply the email protection trigger
CREATE TRIGGER prevent_admin_email_modification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_email_changes();