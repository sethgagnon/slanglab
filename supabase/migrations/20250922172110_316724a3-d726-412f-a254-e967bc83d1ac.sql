-- Create dedicated table for edge function rate limiting
CREATE TABLE public.edge_function_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user identifier
  function_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, function_name, window_start)
);

-- Add index for performance
CREATE INDEX idx_edge_function_rate_limits_lookup ON public.edge_function_rate_limits (identifier, function_name, window_start);

-- Drop the broken function and create a proper one
DROP FUNCTION IF EXISTS public.check_edge_function_rate_limit(text, integer, integer);

-- Create a proper rate limiting function
CREATE OR REPLACE FUNCTION public.check_edge_function_rate_limit(
  p_identifier TEXT,
  p_function_name TEXT DEFAULT 'lookup-term',
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time (round down to nearest window)
  window_start_time := date_trunc('hour', now()) + 
                      (EXTRACT(minute FROM now())::INTEGER / p_window_minutes) * 
                      (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current request count in this window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.edge_function_rate_limits
  WHERE identifier = p_identifier 
  AND function_name = p_function_name
  AND window_start = window_start_time;
  
  -- Check if over limit
  IF current_count >= p_max_requests THEN
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      success,
      error_message
    ) VALUES (
      NULL,
      'EDGE_FUNCTION_RATE_LIMIT_EXCEEDED',
      p_function_name,
      false,
      'Rate limit exceeded for ' || p_identifier || ': ' || current_count || '/' || p_max_requests
    );
    RETURN false;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.edge_function_rate_limits (
    identifier, 
    function_name, 
    request_count, 
    window_start,
    updated_at
  )
  VALUES (
    p_identifier, 
    p_function_name, 
    1, 
    window_start_time,
    now()
  )
  ON CONFLICT (identifier, function_name, window_start) 
  DO UPDATE SET 
    request_count = edge_function_rate_limits.request_count + 1,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Enable RLS on the new table
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system access
CREATE POLICY "System can manage edge function rate limits" 
ON public.edge_function_rate_limits 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policy for admin access
CREATE POLICY "Admins can view edge function rate limits" 
ON public.edge_function_rate_limits 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_edge_function_rate_limits_updated_at
  BEFORE UPDATE ON public.edge_function_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();