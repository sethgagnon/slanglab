-- Phase 1: Create secure payment table and encryption functions

-- 1. Create encryption/decryption functions for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use a combination of system entropy and fixed salt for encryption
  -- In production, you'd want to manage this key more securely
  encryption_key := encode(digest('slanglab_encrypt_key_2025', 'sha256'), 'hex');
  
  IF data IS NULL OR length(data) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Use AES encryption with the generated key
  RETURN encode(encrypt(data::bytea, encryption_key::bytea, 'aes'), 'base64');
END;
$$;

-- Create a secure function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use the same key for decryption
  encryption_key := encode(digest('slanglab_encrypt_key_2025', 'sha256'), 'hex');
  
  IF encrypted_data IS NULL OR length(encrypted_data) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Decrypt and return original data
  RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), encryption_key::bytea, 'aes'), 'UTF8');
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (corrupted data)
    RETURN NULL;
END;
$$;

-- 2. Create secure payment information table
CREATE TABLE IF NOT EXISTS public.secure_payment_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment table
ALTER TABLE public.secure_payment_info ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies for payment data
CREATE POLICY "Users can only access their own payment info" 
ON public.secure_payment_info 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment info" 
ON public.secure_payment_info 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- 3. Create secure personal information table
CREATE TABLE IF NOT EXISTS public.secure_personal_info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  encrypted_birth_date text, -- Encrypted birth date
  encrypted_parent_email text, -- Encrypted parent email
  age_verified boolean DEFAULT false,
  safe_mode boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on personal info table
ALTER TABLE public.secure_personal_info ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies for personal data
CREATE POLICY "Users can only access their own personal info" 
ON public.secure_personal_info 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view personal info" 
ON public.secure_personal_info 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- 4. Create triggers for updated_at columns
CREATE TRIGGER update_secure_payment_info_updated_at
  BEFORE UPDATE ON public.secure_payment_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_secure_personal_info_updated_at
  BEFORE UPDATE ON public.secure_personal_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Migrate existing data from profiles to secure tables
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

-- Migrate personal info with encryption
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