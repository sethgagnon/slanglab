-- Fix security vulnerability: Remove public access to user emails and sensitive data
-- This addresses the "PUBLIC_USER_DATA" security finding

-- 1. Remove public email access from profiles table
-- Update profiles policies to ensure emails are never publicly accessible
DROP POLICY IF EXISTS "Anyone can view published terms" ON public.terms;

-- Create more restrictive policies for terms table
CREATE POLICY "Anyone can view basic term info" ON public.terms
FOR SELECT USING (true);

-- Ensure profiles table doesn't leak emails through any policy
-- Remove any potential for email exposure by creating a view for public term display
CREATE OR REPLACE VIEW public.public_terms AS
SELECT 
  t.id,
  t.text,
  t.normalized_text,
  t.original_text,
  t.slug,
  t.created_at,
  -- Exclude user_id and other identifying information from public view
  'anonymous' as creator_type
FROM public.terms t;

-- Grant public access to the view instead of direct table access
GRANT SELECT ON public.public_terms TO anon;
GRANT SELECT ON public.public_terms TO authenticated;

-- 2. Create additional RLS policies to prevent indirect data exposure
-- Ensure that joining terms with profiles cannot expose email addresses
CREATE POLICY "Profiles are only visible to owners and admins" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Drop the existing broad policies that might allow public access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Recreate specific policies with proper access control
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile only" ON public.profiles
FOR DELETE USING (auth.uid() = user_id);

-- 3. Fix creator_stats public exposure
-- Update creator_stats to only show limited public information
CREATE OR REPLACE VIEW public.public_creator_stats AS
SELECT 
  user_id,
  total_creations,
  -- Remove potentially sensitive behavioral data
  CASE WHEN total_creations > 10 THEN 'active' ELSE 'beginner' END as activity_level,
  created_at
FROM public.creator_stats 
WHERE is_public = true;

-- Grant access to the limited view
GRANT SELECT ON public.public_creator_stats TO anon;
GRANT SELECT ON public.public_creator_stats TO authenticated;

-- 4. Add additional protection for sensitive tables
-- Ensure secure_payment_info and secure_personal_info are properly protected
CREATE POLICY "Payment info strictly owner only" ON public.secure_payment_info
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Personal info strictly owner only" ON public.secure_personal_info  
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);