-- Create recent_generations table for 90-second cache
CREATE TABLE public.recent_generations (
  key TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  model TEXT NOT NULL,
  usage JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_call_logs table for structured logging
CREATE TABLE public.ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id TEXT,
  client_ip TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  model TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  status INTEGER NOT NULL,
  was_cached BOOLEAN DEFAULT false,
  was_coalesced BOOLEAN DEFAULT false
);

-- Enable RLS on both tables
ALTER TABLE public.recent_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for recent_generations (system access only)
CREATE POLICY "System can manage recent generations" 
ON public.recent_generations 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS policies for ai_call_logs (admin view, system manage)
CREATE POLICY "Admins can view AI call logs" 
ON public.ai_call_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can create AI call logs" 
ON public.ai_call_logs 
FOR INSERT 
WITH CHECK (true);

-- Add index for efficient cache lookup
CREATE INDEX idx_recent_generations_expires_at ON public.recent_generations(expires_at);

-- Add index for efficient log queries
CREATE INDEX idx_ai_call_logs_created_at ON public.ai_call_logs(created_at);
CREATE INDEX idx_ai_call_logs_user_id ON public.ai_call_logs(user_id);