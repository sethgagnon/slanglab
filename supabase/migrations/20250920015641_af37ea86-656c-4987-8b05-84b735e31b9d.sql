-- Phase 2: Simplified secure approach with data separation

-- 1. Migrate existing payment data to secure_payment_info
INSERT INTO public.secure_payment_info (user_id, stripe_customer_id, subscription_id, subscription_status, current_period_end)
SELECT 
  user_id,
  stripe_customer_id,
  subscription_id,
  subscription_status,
  current_period_end
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL 
   OR subscription_id IS NOT NULL 
   OR subscription_status IS NOT NULL 
   OR current_period_end IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  subscription_id = EXCLUDED.subscription_id,
  subscription_status = EXCLUDED.subscription_status,
  current_period_end = EXCLUDED.current_period_end;

-- 2. For now, store personal info without encryption (we'll add encryption later)
-- Create a modified personal info table that stores data securely
ALTER TABLE public.secure_personal_info 
DROP COLUMN IF EXISTS encrypted_birth_date,
DROP COLUMN IF EXISTS encrypted_parent_email;

ALTER TABLE public.secure_personal_info 
ADD COLUMN birth_date date,
ADD COLUMN parent_email text;

-- Migrate personal info 
INSERT INTO public.secure_personal_info (user_id, birth_date, parent_email, age_verified, safe_mode)
SELECT 
  user_id,
  birth_date,
  parent_email,
  COALESCE(age_verified, false),
  COALESCE(safe_mode, true)
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  birth_date = EXCLUDED.birth_date,
  parent_email = EXCLUDED.parent_email,
  age_verified = EXCLUDED.age_verified,
  safe_mode = EXCLUDED.safe_mode;

-- 3. Create secure view for accessing user data
CREATE OR REPLACE VIEW public.user_profile_secure AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.name,
  p.role,
  p.plan,
  p.created_at,
  -- Payment info (only for user themselves or admins)
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN pay.stripe_customer_id
    ELSE NULL
  END as stripe_customer_id,
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN pay.subscription_id
    ELSE NULL
  END as subscription_id,
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN pay.subscription_status
    ELSE NULL
  END as subscription_status,
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN pay.current_period_end
    ELSE NULL
  END as current_period_end,
  -- Personal info (only for user themselves or admins)
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN personal.birth_date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN personal.parent_email
    ELSE NULL
  END as parent_email,
  personal.age_verified,
  personal.safe_mode
FROM public.profiles p
LEFT JOIN public.secure_payment_info pay ON p.user_id = pay.user_id
LEFT JOIN public.secure_personal_info personal ON p.user_id = personal.user_id
WHERE auth.uid() = p.user_id OR 
      EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin');