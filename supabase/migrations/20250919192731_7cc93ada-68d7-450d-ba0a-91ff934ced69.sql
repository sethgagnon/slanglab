-- Fix remaining function search path issue
-- Check for functions without search_path set and fix them
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;