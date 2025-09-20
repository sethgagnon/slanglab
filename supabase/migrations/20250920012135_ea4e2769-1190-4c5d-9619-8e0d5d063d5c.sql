-- Security Enhancement 4: Create data masking function and secure view
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL OR length(input_text) = 0 THEN
    RETURN input_text;
  END IF;
  
  -- Mask all but first and last character for emails and names
  IF length(input_text) <= 2 THEN
    RETURN repeat('*', length(input_text));
  ELSE
    RETURN left(input_text, 1) || repeat('*', length(input_text) - 2) || right(input_text, 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Create secure profile view with conditional masking (for potential future admin access)
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  user_id,
  -- Only show full data to the profile owner, mask for admin users
  CASE 
    WHEN auth.uid() = user_id THEN name
    ELSE public.mask_sensitive_data(name)
  END as name,
  CASE 
    WHEN auth.uid() = user_id THEN email
    ELSE public.mask_sensitive_data(email)
  END as email,
  -- Never expose birth_date and parent_email unless it's the user's own profile
  CASE 
    WHEN auth.uid() = user_id THEN birth_date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN auth.uid() = user_id THEN parent_email
    ELSE NULL
  END as parent_email,
  -- Safe fields can be shown normally
  age_verified,
  safe_mode,
  plan,
  role,
  subscription_status,
  created_at
FROM public.profiles
WHERE auth.uid() = user_id OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      );