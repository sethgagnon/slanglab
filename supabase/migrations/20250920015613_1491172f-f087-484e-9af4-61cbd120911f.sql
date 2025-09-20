-- Phase 2: Migrate existing data and clean up profiles table

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

-- 2. Migrate personal info with encryption
INSERT INTO public.secure_personal_info (user_id, encrypted_birth_date, encrypted_parent_email, age_verified, safe_mode)
SELECT 
  user_id,
  CASE WHEN birth_date IS NOT NULL THEN public.encrypt_pii(birth_date::text) ELSE NULL END,
  CASE WHEN parent_email IS NOT NULL THEN public.encrypt_pii(parent_email) ELSE NULL END,
  COALESCE(age_verified, false),
  COALESCE(safe_mode, true)
FROM public.profiles
WHERE birth_date IS NOT NULL 
   OR parent_email IS NOT NULL 
   OR age_verified IS NOT NULL 
   OR safe_mode IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  encrypted_birth_date = EXCLUDED.encrypted_birth_date,
  encrypted_parent_email = EXCLUDED.encrypted_parent_email,
  age_verified = EXCLUDED.age_verified,
  safe_mode = EXCLUDED.safe_mode;

-- 3. Create secure view for accessing user data with decryption
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
    THEN public.decrypt_pii(personal.encrypted_birth_date)::date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN auth.uid() = p.user_id OR 
         EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin')
    THEN public.decrypt_pii(personal.encrypted_parent_email)
    ELSE NULL
  END as parent_email,
  personal.age_verified,
  personal.safe_mode
FROM public.profiles p
LEFT JOIN public.secure_payment_info pay ON p.user_id = pay.user_id
LEFT JOIN public.secure_personal_info personal ON p.user_id = personal.user_id
WHERE auth.uid() = p.user_id OR 
      EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin');

-- 4. Remove sensitive columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_period_end;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS parent_email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS age_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS safe_mode;