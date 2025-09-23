-- Fix conflicting RLS policies on secure_payment_info table
-- Remove duplicate policy that could cause confusion
DROP POLICY IF EXISTS "Users can only access their own payment info" ON public.secure_payment_info;

-- Ensure we have clean, non-conflicting policies
-- Keep the "Payment info strictly owner only" policy for user access
-- Keep the "Admins can view all payment info" policy for admin access

-- Add additional security: ensure no public access and authenticated users only
REVOKE ALL ON public.secure_payment_info FROM PUBLIC;
REVOKE ALL ON public.secure_payment_info FROM anon;

-- Grant specific permissions only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secure_payment_info TO authenticated;

-- Add audit trigger for payment info access
CREATE OR REPLACE FUNCTION public.audit_payment_info_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log payment info access for security monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    timestamp,
    success
  ) VALUES (
    auth.uid(),
    TG_OP || '_PAYMENT_INFO',
    'secure_payment_info',
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE COALESCE(NEW.id, OLD.id)
    END,
    now(),
    true
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger
DROP TRIGGER IF EXISTS audit_payment_info_trigger ON public.secure_payment_info;
CREATE TRIGGER audit_payment_info_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.secure_payment_info
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_info_access();