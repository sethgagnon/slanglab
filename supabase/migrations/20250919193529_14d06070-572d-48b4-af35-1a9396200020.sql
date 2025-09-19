-- Fix the is_profile_owner function search path
ALTER FUNCTION public.is_profile_owner(uuid) SET search_path = public;