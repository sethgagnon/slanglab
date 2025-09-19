-- Create slang_shares table for tracking all social media shares
CREATE TABLE public.slang_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'snapchat', 'tiktok', 'reddit', 'linkedin', 'whatsapp', 'telegram', 'web_share', 'copy_link')),
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  share_url TEXT,
  share_content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.slang_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for slang_shares
CREATE POLICY "Users can create their own shares" 
ON public.slang_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own shares" 
ON public.slang_shares 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_slang_shares_creation_id ON public.slang_shares(creation_id);
CREATE INDEX idx_slang_shares_user_id ON public.slang_shares(user_id);
CREATE INDEX idx_slang_shares_platform ON public.slang_shares(platform);