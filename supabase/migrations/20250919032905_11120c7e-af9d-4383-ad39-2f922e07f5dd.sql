-- First update existing data to match new plan names
UPDATE public.profiles 
SET plan = 'Free' 
WHERE plan = 'free';

-- Add subscription tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Drop the existing constraint if it exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- Add new constraint with all plan types
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_plan_check 
CHECK (plan IN ('Free', 'SearchPro', 'LabPro'));

-- Update default for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN plan SET DEFAULT 'Free';