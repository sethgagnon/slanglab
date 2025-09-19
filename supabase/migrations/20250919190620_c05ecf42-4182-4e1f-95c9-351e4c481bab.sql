-- Remove the overly broad admin policy that bypasses user restrictions
-- This addresses the security vulnerability where admins could access all profile data

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- The remaining policies ensure only authenticated users can access their own profile data:
-- - "Users can view own profile" - users can only see their own profile
-- - "Users can insert own profile" - users can only create their own profile  
-- - "Users can update own profile" - users can only modify their own profile
-- - "Users can delete own profile" - users can only delete their own profile

-- This ensures customer payment and personal data is properly protected