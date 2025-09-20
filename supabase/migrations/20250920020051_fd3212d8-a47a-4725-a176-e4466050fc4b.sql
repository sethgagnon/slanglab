-- Phase 4: Fix view security (corrected)

-- 1. Drop the problematic view
DROP VIEW IF EXISTS public.user_profile_secure;

-- 2. Create helper functions that respect RLS (without problematic triggers)
CREATE OR REPLACE FUNCTION public.get_secure_user_profile(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  name text,
  role text,
  plan text,
  created_at timestamp with time zone,
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  current_period_end timestamp with time zone,
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
  WHERE p.user_id = target_user_id
  AND (auth.uid() = target_user_id OR 
       EXISTS (SELECT 1 FROM profiles admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin'));
$$;

-- 3. Add comments to document why certain functions need SECURITY DEFINER
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: This function must run with elevated privileges to create user profiles during auth.users trigger execution.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'SECURITY DEFINER required: This function needs elevated privileges to update timestamps across multiple tables.';
COMMENT ON FUNCTION public.validate_profile_data() IS 'SECURITY DEFINER required: This function performs data validation that requires system-level access.';
COMMENT ON FUNCTION public.check_profile_access_rate_limit() IS 'SECURITY DEFINER required: This function manages rate limiting across user sessions and requires elevated privileges.';

-- 4. Create a secure function to log sensitive data access (when called explicitly)
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  action_type text,
  table_name text,
  record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SET search_path = 'public'
AS $$
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    record_id,
    timestamp,
    success
  ) VALUES (
    auth.uid(),
    action_type,
    log_sensitive_data_access.table_name,
    log_sensitive_data_access.record_id,
    now(),
    true
  );
$$;

-- 5. Update code to use the new secure structure by updating the function calls