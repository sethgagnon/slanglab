-- Create creation_monitoring table to track shared slang in the wild
CREATE TABLE public.creation_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  monitoring_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_found_at TIMESTAMP WITH TIME ZONE,
  times_found INTEGER NOT NULL DEFAULT 0,
  trending_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring', 'spotted', 'trending', 'dormant')),
  platforms_detected TEXT[] DEFAULT '{}',
  search_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (search_frequency IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creation_id)
);

-- Enable RLS
ALTER TABLE public.creation_monitoring ENABLE ROW LEVEL SECURITY;

-- Create policies for creation_monitoring
CREATE POLICY "Users can view their own monitoring data"
ON public.creation_monitoring
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create monitoring for their own creations"
ON public.creation_monitoring
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.creations 
    WHERE id = creation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own monitoring data"
ON public.creation_monitoring
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_creation_monitoring_updated_at
BEFORE UPDATE ON public.creation_monitoring
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient lookups
CREATE INDEX idx_creation_monitoring_user_id ON public.creation_monitoring(user_id);
CREATE INDEX idx_creation_monitoring_status ON public.creation_monitoring(status);
CREATE INDEX idx_creation_monitoring_last_checked ON public.creation_monitoring(last_checked_at);