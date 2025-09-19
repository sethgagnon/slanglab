-- Fix security warnings by setting search_path for functions
-- Update the get_week_start function to be security definer with explicit search path
DROP FUNCTION IF EXISTS get_week_start(date);

CREATE OR REPLACE FUNCTION public.get_week_start(input_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get Monday of the current week
  RETURN input_date - (EXTRACT(dow FROM input_date)::integer + 6) % 7;
END;
$$;