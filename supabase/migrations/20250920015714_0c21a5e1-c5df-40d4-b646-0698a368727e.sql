-- Phase 3: Clean up profiles table and fix security issues

-- 1. Remove sensitive columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_period_end;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS parent_email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS age_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS safe_mode;

-- 2. Remove the security definer functions that are causing issues
DROP FUNCTION IF EXISTS public.encrypt_pii(text);
DROP FUNCTION IF EXISTS public.decrypt_pii(text);

-- 3. Create helper functions for secure data access (without SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_payment_info(target_user_id uuid)
RETURNS TABLE (
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  current_period_end timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT 
    spi.stripe_customer_id,
    spi.subscription_id,
    spi.subscription_status,
    spi.current_period_end
  FROM secure_payment_info spi
  WHERE spi.user_id = target_user_id
  AND (auth.uid() = target_user_id OR 
       EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.get_user_personal_info(target_user_id uuid)
RETURNS TABLE (
  birth_date date,
  parent_email text,
  age_verified boolean,
  safe_mode boolean
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT 
    spi.birth_date,
    spi.parent_email,
    spi.age_verified,
    spi.safe_mode
  FROM secure_personal_info spi
  WHERE spi.user_id = target_user_id
  AND (auth.uid() = target_user_id OR 
       EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
$$;

-- 4. Create simplified secure view without SECURITY DEFINER functions
DROP VIEW IF EXISTS public.user_profile_secure;

CREATE VIEW public.user_profile_secure AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.name,
  p.role,
  p.plan,
  p.created_at,
  pay.stripe_customer_id,
  pay.subscription_id,
  pay.subscription_status,
  pay.current_period_end,
  personal.birth_date,
  personal.parent_email,
  personal.age_verified,
  personal.safe_mode
FROM public.profiles p
LEFT JOIN public.secure_payment_info pay ON p.user_id = pay.user_id
LEFT JOIN public.secure_personal_info personal ON p.user_id = personal.user_id
WHERE auth.uid() = p.user_id OR 
      EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin');