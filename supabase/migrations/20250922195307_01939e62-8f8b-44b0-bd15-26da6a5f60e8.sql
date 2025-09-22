-- Create security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create new admin policy using the security definer function
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (
  is_authenticated_user() AND public.get_current_user_role() = 'admin'
)
WITH CHECK (
  is_authenticated_user() AND public.get_current_user_role() = 'admin'
);

-- Also clean up any duplicate policies to prevent conflicts
DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;