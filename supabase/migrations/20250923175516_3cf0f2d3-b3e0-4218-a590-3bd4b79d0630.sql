-- Fix infinite recursion in profiles RLS policies
-- The issue is circular dependency where RLS policies call functions 
-- that query profiles table, creating an infinite loop

-- First, update the get_current_user_role function to use SECURITY DEFINER
-- This allows it to bypass RLS policies and break the recursion
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

-- Drop ALL existing problematic RLS policies on profiles
DROP POLICY IF EXISTS "Admins can update user roles only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for admin tasks" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are only visible to owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create clean, simple RLS policies that avoid recursion

-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to update their own profile (simple version)
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own profile
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policies using the security definer function
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());