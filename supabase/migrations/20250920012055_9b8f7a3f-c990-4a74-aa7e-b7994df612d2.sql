-- Security Enhancement 2: Create function to log profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger AS $$
BEGIN
  -- Log the access attempt
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    record_id,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    now()
  );
  
  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit trigger to profiles table
CREATE TRIGGER audit_profile_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();