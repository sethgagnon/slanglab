-- Phase 1: Safety Backbone + Age Controls - Database Enhancement
-- Add age_band column to secure_personal_info table for server-side age enforcement

-- Add age_band column to store computed age bands (derived from birth_date)
ALTER TABLE public.secure_personal_info 
ADD COLUMN IF NOT EXISTS age_band text;

-- Create age band computation function
CREATE OR REPLACE FUNCTION public.compute_age_band(birth_date_input date)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  age_years integer;
BEGIN
  -- Return null if no birth date provided
  IF birth_date_input IS NULL THEN
    RETURN NULL;
  END IF;
  
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

-- Create trigger to automatically update age_band when birth_date changes
CREATE OR REPLACE FUNCTION public.update_age_band()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Update age_band based on birth_date
  NEW.age_band := public.compute_age_band(NEW.birth_date);
  RETURN NEW;
END;
$$;

-- Create trigger for automatic age_band updates
DROP TRIGGER IF EXISTS trigger_update_age_band ON public.secure_personal_info;
CREATE TRIGGER trigger_update_age_band
  BEFORE INSERT OR UPDATE OF birth_date 
  ON public.secure_personal_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_age_band();

-- Update existing records to populate age_band
UPDATE public.secure_personal_info 
SET age_band = public.compute_age_band(birth_date)
WHERE birth_date IS NOT NULL;

-- Create function to get age policy for server-side enforcement
CREATE OR REPLACE FUNCTION public.get_age_policy(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_age_band text;
  policy_data jsonb;
BEGIN
  -- Get user's age band, default to safest (11-13) if not found
  SELECT age_band INTO user_age_band
  FROM public.secure_personal_info
  WHERE user_id = target_user_id;
  
  -- Default to safest age band if no data found
  user_age_band := COALESCE(user_age_band, '11-13');
  
  -- Return age-specific policy
  CASE user_age_band
    WHEN '11-13' THEN
      policy_data := jsonb_build_object(
        'ageBand', '11-13',
        'requireSchoolSafe', true,
        'maxCreativity', 0.6,
        'allowedFormats', jsonb_build_array('word', 'short_phrase'),
        'allowedContexts', jsonb_build_array('homework', 'food', 'sports', 'gaming', 'music', 'generic'),
        'canShare', false
      );
    WHEN '14-17' THEN
      policy_data := jsonb_build_object(
        'ageBand', '14-17',
        'requireSchoolSafe', true,
        'maxCreativity', 0.7,
        'allowedFormats', jsonb_build_array('word', 'short_phrase', 'emoji_word_mash'),
        'allowedContexts', jsonb_build_array('homework', 'food', 'sports', 'gaming', 'music', 'fashion', 'generic', 'inside-joke'),
        'canShare', true
      );
    WHEN '18-22' THEN
      policy_data := jsonb_build_object(
        'ageBand', '18-22',
        'requireSchoolSafe', false,
        'maxCreativity', 0.8,
        'allowedFormats', jsonb_build_array('word', 'short_phrase', 'emoji_word_mash'),
        'allowedContexts', jsonb_build_array('homework', 'food', 'sports', 'gaming', 'music', 'fashion', 'generic', 'inside-joke'),
        'canShare', true
      );
    ELSE
      -- Default to safest policy
      policy_data := jsonb_build_object(
        'ageBand', '11-13',
        'requireSchoolSafe', true,
        'maxCreativity', 0.6,
        'allowedFormats', jsonb_build_array('word', 'short_phrase'),
        'allowedContexts', jsonb_build_array('homework', 'food', 'sports', 'gaming', 'music', 'generic'),
        'canShare', false
      );
  END CASE;
  
  RETURN policy_data;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_personal_info_age_band 
ON public.secure_personal_info(age_band);

CREATE INDEX IF NOT EXISTS idx_secure_personal_info_user_age 
ON public.secure_personal_info(user_id, age_band);