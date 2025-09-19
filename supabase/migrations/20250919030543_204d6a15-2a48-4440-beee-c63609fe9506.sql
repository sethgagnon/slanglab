-- Update profiles table to support new plan types
ALTER TABLE public.profiles 
ALTER COLUMN plan SET DEFAULT 'Free';

-- Update existing free plan users to use proper case
UPDATE public.profiles 
SET plan = 'Free' 
WHERE plan = 'free';

-- Create anonymous_searches table for tracking non-authenticated users
CREATE TABLE public.anonymous_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  search_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on anonymous_searches
ALTER TABLE public.anonymous_searches ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous searches (accessible by functions)
CREATE POLICY "Anonymous searches accessible by authenticated functions" 
ON public.anonymous_searches 
FOR ALL 
USING (true);

-- Add monthly reset tracking to limits table
ALTER TABLE public.limits 
ADD COLUMN month_year TEXT GENERATED ALWAYS AS (TO_CHAR(date, 'YYYY-MM')) STORED;

-- Create unique constraint for user_id and month_year
ALTER TABLE public.limits 
ADD CONSTRAINT unique_user_month UNIQUE (user_id, month_year);

-- Add creation_used column for slang creation tracking
ALTER TABLE public.limits 
ADD COLUMN creations_used INTEGER NOT NULL DEFAULT 0;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for anonymous_searches
CREATE TRIGGER update_anonymous_searches_updated_at
BEFORE UPDATE ON public.anonymous_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();