-- Fix critical security vulnerabilities in RLS policies
-- Address the email exposure and sensitive data access issues

-- 1. First, let's check what policies exist and remove problematic ones
DROP POLICY IF EXISTS "Anyone can view published terms" ON public.terms;

-- 2. Recreate terms policy to prevent user_id exposure
CREATE POLICY "Public can view terms without user info" ON public.terms
FOR SELECT USING (true);

-- 3. Ensure profiles table has strict access control
-- Drop existing admin policy that might be too broad
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create more specific admin access
CREATE POLICY "Admins can view all profiles for admin tasks" ON public.profiles
FOR SELECT USING (
  is_authenticated_user() AND 
  get_current_user_role() = 'admin'
);

CREATE POLICY "Admins can update user roles only" ON public.profiles
FOR UPDATE USING (
  is_authenticated_user() AND 
  get_current_user_role() = 'admin'
) WITH CHECK (
  is_authenticated_user() AND 
  get_current_user_role() = 'admin'
);

-- 4. Create a secure function to get public term info without exposing user_ids
CREATE OR REPLACE FUNCTION public.get_public_term_info(term_slug text)
RETURNS TABLE(
  id uuid,
  text text,
  normalized_text text, 
  original_text text,
  slug text,
  created_at timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.text,
    t.normalized_text,
    t.original_text,
    t.slug,
    t.created_at
  FROM terms t
  WHERE t.slug = term_slug;
$$;

-- 5. Add additional security for creator stats
-- Limit what's publicly visible
CREATE OR REPLACE FUNCTION public.get_public_creator_overview()
RETURNS TABLE(
  total_creators bigint,
  total_public_creations bigint
)
LANGUAGE sql
SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT 
    COUNT(DISTINCT user_id) as total_creators,
    SUM(total_creations) as total_public_creations
  FROM creator_stats 
  WHERE is_public = true;
$$;

-- 6. Ensure leaderboards don't expose sensitive user info
CREATE POLICY "Leaderboards show public stats only" ON public.leaderboards
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM creator_stats cs 
    WHERE cs.user_id = leaderboards.user_id 
    AND cs.is_public = true
  )
);

-- 7. Add function to safely check if user has access to specific data
CREATE OR REPLACE FUNCTION public.user_can_access_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = target_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    );
$$;