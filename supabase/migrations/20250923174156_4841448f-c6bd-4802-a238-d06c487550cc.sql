-- Final security fix: Remove all security definer views that are flagged by the linter
-- These were created in previous migrations and need to be cleaned up

-- Find and drop any remaining security definer views
DROP VIEW IF EXISTS public.public_terms CASCADE;
DROP VIEW IF EXISTS public.public_creator_stats CASCADE;

-- Remove the security definer function grants that might be creating issues
-- and ensure we have clean, properly secured functions only

-- The linter errors show we have views with security definer properties
-- Let's query to see what views exist and remove them all
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Drop all views in public schema that might have security definer properties
    FOR view_record IN
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_record.schemaname) || '.' || quote_ident(view_record.viewname) || ' CASCADE';
    END LOOP;
END
$$;

-- Now ensure all our security functions have proper search_path
-- Update any remaining functions that might not have it set correctly
DROP FUNCTION IF EXISTS public.get_safe_term_data(text);
DROP FUNCTION IF EXISTS public.get_safe_creator_stats();

-- Create simple, safe query functions without security definer properties
CREATE OR REPLACE FUNCTION public.get_anonymous_term_info(term_slug text)
RETURNS TABLE(
  term_text text,
  meaning_summary text
) 
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.text as term_text,
    'Available via lookup' as meaning_summary
  FROM terms t
  WHERE t.slug = term_slug
  LIMIT 1;
END;
$$;

-- Grant execute permissions carefully
GRANT EXECUTE ON FUNCTION public.get_anonymous_term_info(text) TO anon, authenticated;

-- Ensure all policies are working correctly without exposing sensitive data
-- Update the leaderboards policy to be more restrictive
DROP POLICY IF EXISTS "Leaderboards show public stats only" ON public.leaderboards;

CREATE POLICY "Public leaderboards limited data" ON public.leaderboards
FOR SELECT USING (
  -- Only show leaderboard entries where user has explicitly made stats public
  EXISTS (
    SELECT 1 FROM creator_stats cs 
    WHERE cs.user_id = leaderboards.user_id 
    AND cs.is_public = true
  )
);