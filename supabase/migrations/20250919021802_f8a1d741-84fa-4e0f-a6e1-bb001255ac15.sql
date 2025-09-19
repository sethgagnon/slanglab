-- Fix RLS policies for enhanced security - handling existing policies

-- 1. Fix profiles table security - ensure only profile owners can access their data
-- Drop all existing policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- Create secure profiles policies
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

-- Admin can view all profiles for management purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'
  )
);

-- 2. Fix creations table security - users can only see their own creations
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view creations" ON public.creations;
    DROP POLICY IF EXISTS "Users can only view their own creations" ON public.creations;
    DROP POLICY IF EXISTS "Users can create their own creations" ON public.creations;
    DROP POLICY IF EXISTS "Users can only create their own creations" ON public.creations;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE POLICY "Users can only view their own creations" 
ON public.creations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only create their own creations" 
ON public.creations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own creations" 
ON public.creations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own creations" 
ON public.creations FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Fix votes table security - restrict access properly
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can view votes on their creations" ON public.votes;
    DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can create their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can only create their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can only update their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes;
    DROP POLICY IF EXISTS "Users can only delete their own votes" ON public.votes;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

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

CREATE POLICY "Users can only create their own votes" 
ON public.votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own votes" 
ON public.votes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own votes" 
ON public.votes FOR DELETE 
USING (auth.uid() = user_id);