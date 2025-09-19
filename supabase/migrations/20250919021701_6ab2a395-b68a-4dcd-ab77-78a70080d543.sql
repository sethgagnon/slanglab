-- Fix RLS policies for enhanced security

-- 1. Fix profiles table security - ensure only profile owners can access their data
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create more restrictive profiles policies
CREATE POLICY "Users can only view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own profile" 
ON public.profiles FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Fix creations table security - users can only see their own creations
DROP POLICY IF EXISTS "Anyone can view creations" ON public.creations;

CREATE POLICY "Users can only view their own creations" 
ON public.creations FOR SELECT 
USING (auth.uid() = user_id);

-- Keep the existing insert policy but make it more explicit
DROP POLICY IF EXISTS "Users can create their own creations" ON public.creations;
CREATE POLICY "Users can only create their own creations" 
ON public.creations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add update and delete policies for creations
CREATE POLICY "Users can only update their own creations" 
ON public.creations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own creations" 
ON public.creations FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Fix votes table security - users can only see votes for creations they own or votes they made
DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;

-- Allow users to see votes on their own creations
CREATE POLICY "Users can view votes on their creations" 
ON public.votes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.creations 
    WHERE creations.id = votes.creation_id 
    AND creations.user_id = auth.uid()
  )
);

-- Allow users to see their own votes
CREATE POLICY "Users can view their own votes" 
ON public.votes FOR SELECT 
USING (auth.uid() = user_id);

-- Keep existing vote management policies but make them more explicit
DROP POLICY IF EXISTS "Users can create their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes;

CREATE POLICY "Users can only create their own votes" 
ON public.votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own votes" 
ON public.votes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own votes" 
ON public.votes FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Add additional security function for checking profile ownership
CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update admin policies to be more explicit
-- Ensure admin reports policies are secure
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add admin policy for managing user profiles (admin-only)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'
  )
);

-- 6. Ensure lookups are properly secured (users can only see their own)
DROP POLICY IF EXISTS "Users can view their own lookups" ON public.lookups;
CREATE POLICY "Users can only view their own lookups" 
ON public.lookups FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own lookups" ON public.lookups;
CREATE POLICY "Users can only create their own lookups" 
ON public.lookups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 7. Ensure favorites are properly secured
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can only view their own favorites" 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own favorites" ON public.favorites;
CREATE POLICY "Users can only create their own favorites" 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can only delete their own favorites" 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Ensure limits are properly secured
DROP POLICY IF EXISTS "Users can view their own limits" ON public.limits;
CREATE POLICY "Users can only view their own limits" 
ON public.limits FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own limits" ON public.limits;
CREATE POLICY "Users can only create their own limits" 
ON public.limits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own limits" ON public.limits;
CREATE POLICY "Users can only update their own limits" 
ON public.limits FOR UPDATE 
USING (auth.uid() = user_id);