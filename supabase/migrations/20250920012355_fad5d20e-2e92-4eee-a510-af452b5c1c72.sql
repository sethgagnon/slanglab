-- Create secure profile view with conditional masking (without SECURITY DEFINER)
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  user_id,
  -- Only show full data to the profile owner or admins
  CASE 
    WHEN auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
    THEN name
    ELSE public.mask_sensitive_data(name)
  END as name,
  CASE 
    WHEN auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
    THEN email
    ELSE public.mask_sensitive_data(email)
  END as email,
  -- Never expose birth_date and parent_email unless it's the user's own profile or admin
  CASE 
    WHEN auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
    THEN birth_date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
    THEN parent_email
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
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
      );