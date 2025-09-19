-- Fix the specific security issue with creations table being publicly readable
-- The issue is that creations table allows "Anyone can view creations" which exposes user activity

-- First, safely drop the problematic policy
DO $$ 
BEGIN
    -- Drop the public read policy for creations
    DROP POLICY IF EXISTS "Anyone can view creations" ON public.creations;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Policy might not exist
END $$;

-- Create a secure policy that only allows users to see their own creations
-- But check if it already exists first
DO $$ 
BEGIN
    -- Check if the secure policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'creations' 
        AND policyname = 'Users can only view their own creations'
    ) THEN
        CREATE POLICY "Users can only view their own creations" 
        ON public.creations FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Also fix the votes table public read issue
DO $$ 
BEGIN
    -- Drop the public read policy for votes if it exists
    DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create secure vote viewing policies if they don't exist
DO $$ 
BEGIN
    -- Allow users to see votes on their own creations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'votes' 
        AND policyname = 'Users can view votes on their creations'
    ) THEN
        CREATE POLICY "Users can view votes on their creations" 
        ON public.votes FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM public.creations 
            WHERE creations.id = votes.creation_id 
            AND creations.user_id = auth.uid()
          )
        );
    END IF;

    -- Allow users to see their own votes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'votes' 
        AND policyname = 'Users can view their own votes'
    ) THEN
        CREATE POLICY "Users can view their own votes" 
        ON public.votes FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Fix the function search path warning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;