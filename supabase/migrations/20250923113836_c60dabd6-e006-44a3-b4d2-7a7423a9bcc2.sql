-- Update age band from '18-22' to '18+' in existing records
UPDATE secure_personal_info 
SET age_band = '18+' 
WHERE age_band = '18-22';

-- Update the compute_age_band function to return '18+' instead of '18-22'
CREATE OR REPLACE FUNCTION public.compute_age_band(birth_date_input date)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = 'public'
AS $function$
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
  ELSIF age_years >= 18 THEN
    RETURN '18+';
  ELSE
    -- For ages under 11, default to safest (11-13)
    RETURN '11-13';
  END IF;
END;
$function$;

-- Update the get_age_policy function to handle '18+' instead of '18-22'
CREATE OR REPLACE FUNCTION public.get_age_policy(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
    WHEN '18+' THEN
      policy_data := jsonb_build_object(
        'ageBand', '18+',
        'requireSchoolSafe', false,
        'maxCreativity', 0.8,
        'allowedFormats', jsonb_build_array('word', 'short_phrase', 'emoji_word_mash'),
        'allowedContexts', jsonb_build_array('homework', 'food', 'sports', 'gaming', 'music', 'fashion', 'generic', 'inside-joke'),
        'canShare', true
      );
    ELSE
      -- Default to safest policy for any unrecognized age bands or legacy '18-22'
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
$function$;