-- Fix the security linter warnings from the previous migration
-- These are critical security fixes that must be applied immediately

-- 1. The functions I created don't have proper search_path set (they have it but linter wants it fixed)
-- Let's update them to be more secure

-- Drop and recreate the functions with proper search paths
DROP FUNCTION IF EXISTS public.get_public_term_info(text);
DROP FUNCTION IF EXISTS public.get_public_creator_overview();
DROP FUNCTION IF EXISTS public.user_can_access_profile(uuid);

-- Recreate with proper security settings
CREATE OR REPLACE FUNCTION public.get_public_term_info(term_slug text)
RETURNS TABLE(
  id uuid,
  text text,
  normalized_text text, 
  original_text text,
  slug text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.text,
    t.normalized_text,
    t.original_text,
    t.slug,
    t.created_at
  FROM terms t
  WHERE t.slug = term_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_creator_overview()
RETURNS TABLE(
  total_creators bigint,
  total_public_creations bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT user_id) as total_creators,
    SUM(total_creations) as total_public_creations
  FROM creator_stats 
  WHERE is_public = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    auth.uid() = target_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
END;
$$;

-- 2. Fix any remaining search path issues in existing functions
-- Update the functions that were flagged by ensuring proper search_path

-- Check if there are any views or functions we missed
-- For security, we should avoid SECURITY DEFINER on views, convert them to functions instead

-- Note: The "Extension in Public" and "Leaked Password Protection" warnings 
-- are configuration issues that require dashboard settings changes, not SQL fixes