-- Fix security warnings - Set proper search paths for new functions

-- Fix compute_age_band function search path (already has it, but ensuring it's explicit)
CREATE OR REPLACE FUNCTION public.compute_age_band(birth_date_input date)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = public
AS $$
DECLARE
  age_years integer;
BEGIN
  -- Calculate age in years
  age_years := EXTRACT(year FROM age(CURRENT_DATE, birth_date_input));
  
  -- Return appropriate age band
  IF age_years >= 11 AND age_years <= 13 THEN
    RETURN '11-13';
  ELSIF age_years >= 14 AND age_years <= 17 THEN
    RETURN '14-17';  
  ELSIF age_years >= 18 AND age_years <= 22 THEN
    RETURN '18-22';
  ELSE
    -- For ages outside our target range, default to safest (11-13) for under 11, 
    -- and 18-22 for over 22
    IF age_years < 11 THEN
      RETURN '11-13';
    ELSE
      RETURN '18-22';
    END IF;
  END IF;
END;
$$;

-- Fix update_age_band function search path  
CREATE OR REPLACE FUNCTION public.update_age_band()
RETURNS trigger
LANGUAGE plpgsql
STRICT
SET search_path = public
AS $$
BEGIN
  -- Update age_band based on birth_date
  NEW.age_band := public.compute_age_band(NEW.birth_date);
  RETURN NEW;
END;
$$;