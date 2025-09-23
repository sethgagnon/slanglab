-- Fix infinite recursion in profiles RLS policies
-- Drop ALL existing policies on profiles table first
DROP POLICY IF EXISTS "Admins can update user roles only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for admin tasks" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are only visible to owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Update the get_current_user_role function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(checking_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  -- Use a direct query with security definer to bypass RLS
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = checking_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new simplified RLS policies that don't cause recursion

-- Users can view their own profile
CREATE POLICY "Users view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());