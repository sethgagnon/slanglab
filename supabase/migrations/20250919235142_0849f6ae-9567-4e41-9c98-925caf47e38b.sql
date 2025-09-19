-- Populate banned_terms table with comprehensive safety list
INSERT INTO public.banned_terms (phrase) VALUES
-- Profanity and inappropriate content
('damn'), ('hell'), ('crap'), ('piss'), ('shit'), ('fuck'), ('bitch'), ('ass'), ('asshole'),
-- Racial slurs and hate speech
('nigger'), ('nigga'), ('chink'), ('spic'), ('wetback'), ('kike'), ('faggot'), ('dyke'), ('tranny'),
-- Sexual content inappropriate for minors
('penis'), ('vagina'), ('sex'), ('porn'), ('naked'), ('nude'), ('horny'), ('masturbate'), ('orgasm'),
('cum'), ('pussy'), ('dick'), ('cock'), ('tits'), ('boobs'), ('anal'), ('blowjob'), ('slut'), ('whore'),
-- Violence and weapons
('kill'), ('murder'), ('suicide'), ('gun'), ('shoot'), ('bomb'), ('terrorist'), ('violence'), ('rape'),
-- Drugs and substances
('weed'), ('marijuana'), ('cocaine'), ('heroin'), ('meth'), ('drugs'), ('high'), ('stoned'), ('drunk'),
-- Hate speech and discrimination
('nazi'), ('hitler'), ('racist'), ('sexist'), ('homophobic'), ('retard'), ('retarded'), ('gay'), ('lesbian'),
-- Variations and leetspeak
('f*ck'), ('sh*t'), ('b*tch'), ('f4g'), ('n1gger'), ('h8'), ('k1ll'), ('d1ck'), ('p0rn'),
-- Body shaming and bullying
('ugly'), ('fat'), ('stupid'), ('idiot'), ('loser'), ('freak'), ('weird'), ('dumb'), ('pathetic'),
-- Self-harm related
('cutting'), ('selfharm'), ('depression'), ('anxiety') -- These might need review flags rather than bans
ON CONFLICT (phrase) DO NOTHING;

-- Add age verification to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS age_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS safe_mode boolean DEFAULT true;

-- Create content_reports table for user reporting
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id uuid NOT NULL,
  reported_content_type text NOT NULL CHECK (reported_content_type IN ('creation', 'term', 'user')),
  reported_content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'hate_speech', 'bullying', 'spam', 'violence', 'sexual_content', 'self_harm', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on content_reports
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_reports
CREATE POLICY "Users can create reports" ON public.content_reports
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own reports" ON public.content_reports
FOR SELECT TO authenticated
USING (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can view all reports" ON public.content_reports
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update reports" ON public.content_reports
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create user_strikes table for accountability
CREATE TABLE IF NOT EXISTS public.user_strikes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  strike_type text NOT NULL CHECK (strike_type IN ('inappropriate_content', 'spam', 'harassment', 'hate_speech', 'underage_violation')),
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'severe')),
  related_content_id uuid,
  admin_id uuid NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_strikes
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_strikes
CREATE POLICY "Users can view their own strikes" ON public.user_strikes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage strikes" ON public.user_strikes
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add content moderation fields to creations table
ALTER TABLE public.creations 
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
ADD COLUMN IF NOT EXISTS moderation_reason text,
ADD COLUMN IF NOT EXISTS moderated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS moderated_by uuid;

-- Function to check if user is banned or has too many strikes
CREATE OR REPLACE FUNCTION public.user_can_create_content(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  strike_count integer;
  severe_strikes integer;
BEGIN
  -- Count active strikes
  SELECT COUNT(*) INTO strike_count
  FROM user_strikes 
  WHERE user_id = user_uuid 
  AND (expires_at IS NULL OR expires_at > now());
  
  -- Count severe strikes
  SELECT COUNT(*) INTO severe_strikes
  FROM user_strikes 
  WHERE user_id = user_uuid 
  AND severity = 'severe'
  AND (expires_at IS NULL OR expires_at > now());
  
  -- Block if too many strikes
  IF severe_strikes >= 1 OR strike_count >= 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;