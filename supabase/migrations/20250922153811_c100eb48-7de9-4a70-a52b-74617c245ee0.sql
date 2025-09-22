-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  first_sighting_enabled boolean NOT NULL DEFAULT true,
  weekly_digest_enabled boolean NOT NULL DEFAULT true,
  unsubscribe_token text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create digest state tracking table
CREATE TABLE public.digest_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_weekly_digest_sent timestamp with time zone,
  week_start_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create first sighting notifications tracking
CREATE TABLE public.first_sighting_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  term_id uuid NOT NULL,
  sighting_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, term_id, sighting_id)
);

-- Enable RLS on notification tables
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_sighting_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for digest_state
CREATE POLICY "Users can view their own digest state" 
ON public.digest_state 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage digest state" 
ON public.digest_state 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS policies for first_sighting_notifications
CREATE POLICY "Users can view their own first sighting notifications" 
ON public.first_sighting_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage first sighting notifications" 
ON public.first_sighting_notifications 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at columns
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_digest_state_updated_at
BEFORE UPDATE ON public.digest_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create cron job to run trackers every 6 hours
SELECT cron.schedule(
  'run-active-trackers',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
      url := 'https://zzegeatnzvoqhgffqfln.supabase.co/functions/v1/run-tracker-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWdlYXRuenZvcWhnZmZxZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDYzMTQsImV4cCI6MjA3MzgyMjMxNH0.kwq5HsA1ynoRNGpEaLlm9dK09nh9eAylhjIaI1GNQXM"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job for weekly digest on Mondays at 8:00 AM ET (13:00 UTC)
SELECT cron.schedule(
  'weekly-digest',
  '0 13 * * 1', -- Mondays at 13:00 UTC (8:00 AM ET)
  $$
  SELECT
    net.http_post(
      url := 'https://zzegeatnzvoqhgffqfln.supabase.co/functions/v1/notify-creator',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWdlYXRuenZvcWhnZmZxZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDYzMTQsImV4cCI6MjA3MzgyMjMxNH0.kwq5HsA1ynoRNGpEaLlm9dK09nh9eAylhjIaI1GNQXM"}'::jsonb,
      body := '{"type": "weekly_digest"}'::jsonb
    ) as request_id;
  $$
);