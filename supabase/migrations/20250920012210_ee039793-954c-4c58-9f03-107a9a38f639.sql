-- Security Enhancement 3: Create data validation trigger for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Validate email format
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate birth date (not in future, reasonable age limits)
  IF NEW.birth_date IS NOT NULL THEN
    IF NEW.birth_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Birth date cannot be in the future';
    END IF;
    
    IF NEW.birth_date < CURRENT_DATE - interval '120 years' THEN
      RAISE EXCEPTION 'Birth date is unrealistic';
    END IF;
  END IF;
  
  -- Validate parent email format if provided
  IF NEW.parent_email IS NOT NULL AND NEW.parent_email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid parent email format';
  END IF;
  
  -- Prevent role escalation (users cannot change their own role to admin)
  IF TG_OP = 'UPDATE' AND OLD.role != 'admin' AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot escalate role to admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add validation trigger
CREATE TRIGGER validate_profile_data_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_data();