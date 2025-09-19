-- Update user to admin role for testing
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'sethgagnon@gmail.com';