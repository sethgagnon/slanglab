-- Add weekly tracking support to limits table
-- Add a column to track the start of the weekly period
ALTER TABLE public.limits ADD COLUMN week_start_date date;

-- Create an index for efficient weekly lookups
CREATE INDEX idx_limits_user_week ON public.limits(user_id, week_start_date);

-- Add a function to get the start of the current week (Monday)
CREATE OR REPLACE FUNCTION get_week_start(input_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Get Monday of the current week
  RETURN input_date - (EXTRACT(dow FROM input_date)::integer + 6) % 7;
END;
$$;