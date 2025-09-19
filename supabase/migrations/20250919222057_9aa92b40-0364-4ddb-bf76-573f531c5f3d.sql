-- Update RLS policies for creation_monitoring to require LabPro access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create monitoring for their own creations" ON public.creation_monitoring;
DROP POLICY IF EXISTS "Users can view their own monitoring data" ON public.creation_monitoring;
DROP POLICY IF EXISTS "Users can update their own monitoring data" ON public.creation_monitoring;

-- Create security definer function to check LabPro access
CREATE OR REPLACE FUNCTION public.has_labpro_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR plan = 'labpro')
  );
END;
$$;

-- Create new policies that require LabPro access
CREATE POLICY "LabPro users can create monitoring for their own creations"
ON public.creation_monitoring
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_labpro_access()
  AND EXISTS (
    SELECT 1 FROM creations 
    WHERE id = creation_monitoring.creation_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "LabPro users can view their own monitoring data"
ON public.creation_monitoring
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND public.has_labpro_access()
);

CREATE POLICY "LabPro users can update their own monitoring data"
ON public.creation_monitoring
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND public.has_labpro_access()
);