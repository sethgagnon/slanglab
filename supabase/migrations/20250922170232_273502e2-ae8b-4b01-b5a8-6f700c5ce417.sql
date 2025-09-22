-- Create API usage logs table for real-time cost tracking
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- For anonymous users
  api_provider TEXT NOT NULL, -- 'openai', 'serpapi', 'moderation'
  api_endpoint TEXT NOT NULL, -- specific endpoint called
  request_type TEXT NOT NULL, -- 'search', 'generation', 'moderation'
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(10,6), -- Will be populated from billing APIs
  request_data JSONB, -- Store request parameters
  response_data JSONB, -- Store response metadata
  function_name TEXT NOT NULL, -- Which edge function made the call
  status INTEGER NOT NULL, -- HTTP status code
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for API usage logs
CREATE POLICY "Admins can view all API usage logs" 
ON public.api_usage_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Users can view their own API usage logs" 
ON public.api_usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create API usage logs" 
ON public.api_usage_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update API usage logs" 
ON public.api_usage_logs 
FOR UPDATE 
USING (true);

-- Create billing integration table for real cost data
CREATE TABLE public.billing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'stripe', 'openai', 'serpapi'
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  usage_details JSONB, -- Detailed usage breakdown
  raw_billing_data JSONB, -- Raw API response
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for billing data
ALTER TABLE public.billing_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing data" 
ON public.billing_data 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create cost alerts table
CREATE TABLE public.cost_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'daily_threshold', 'monthly_threshold', 'spike_detection'
  threshold_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) NOT NULL,
  alert_message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for cost alerts
ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost alerts" 
ON public.cost_alerts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create indexes for performance
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_api_provider ON public.api_usage_logs(api_provider);
CREATE INDEX idx_api_usage_logs_function_name ON public.api_usage_logs(function_name);
CREATE INDEX idx_billing_data_provider_period ON public.billing_data(provider, billing_period_start, billing_period_end);
CREATE INDEX idx_cost_alerts_created_at ON public.cost_alerts(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_api_usage_logs_updated_at
  BEFORE UPDATE ON public.api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();