-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'team')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terms table
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create senses table  
CREATE TABLE public.senses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  meaning TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('positive', 'neutral', 'insulting', 'adult', 'niche')),
  example TEXT NOT NULL,
  related_json JSONB DEFAULT '[]',
  warning TEXT DEFAULT '',
  confidence TEXT NOT NULL CHECK (confidence IN ('High', 'Medium', 'Low')),
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sources table
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sense_id UUID NOT NULL REFERENCES public.senses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  publisher TEXT,
  snippet TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lookups table
CREATE TABLE public.lookups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, term_id)
);

-- Create creations table
CREATE TABLE public.creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  vibe TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT NOT NULL,
  safe_flag BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creation_id, user_id)
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create limits table
CREATE TABLE public.limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lookups_used INTEGER NOT NULL DEFAULT 0,
  generations_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create source_rules table
CREATE TABLE public.source_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('allow', 'deny')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create banned_terms table
CREATE TABLE public.banned_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for terms (public read, authenticated write)
CREATE POLICY "Anyone can view terms" 
ON public.terms FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create terms" 
ON public.terms FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for senses (public read, authenticated write)
CREATE POLICY "Anyone can view senses" 
ON public.senses FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create senses" 
ON public.senses FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update senses" 
ON public.senses FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for sources (public read, authenticated write)
CREATE POLICY "Anyone can view sources" 
ON public.sources FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create sources" 
ON public.sources FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for lookups (users can view their own)
CREATE POLICY "Users can view their own lookups" 
ON public.lookups FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lookups" 
ON public.lookups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for favorites (users can view their own)
CREATE POLICY "Users can view their own favorites" 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for creations (public read, authenticated write)
CREATE POLICY "Anyone can view creations" 
ON public.creations FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own creations" 
ON public.creations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for votes (users can view all, manage their own)
CREATE POLICY "Anyone can view votes" 
ON public.votes FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own votes" 
ON public.votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.votes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.votes FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for reports (users can view their own, admins can view all)
CREATE POLICY "Users can view their own reports" 
ON public.reports FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create reports" 
ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for limits (users can view their own)
CREATE POLICY "Users can view their own limits" 
ON public.limits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own limits" 
ON public.limits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" 
ON public.limits FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for source_rules (admins only)
CREATE POLICY "Admins can manage source rules" 
ON public.source_rules FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for banned_terms (admins only)
CREATE POLICY "Admins can manage banned terms" 
ON public.banned_terms FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_terms_normalized_text ON public.terms(normalized_text);
CREATE INDEX idx_senses_term_id ON public.senses(term_id);
CREATE INDEX idx_senses_confidence ON public.senses(confidence);
CREATE INDEX idx_sources_sense_id ON public.sources(sense_id);
CREATE INDEX idx_lookups_user_id ON public.lookups(user_id);
CREATE INDEX idx_lookups_created_at ON public.lookups(created_at);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_creations_user_id ON public.creations(user_id);
CREATE INDEX idx_creations_vibe ON public.creations(vibe);
CREATE INDEX idx_votes_creation_id ON public.votes(creation_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_limits_user_date ON public.limits(user_id, date);

-- Insert seed data for demo terms
INSERT INTO public.terms (text, normalized_text) VALUES
  ('mid', 'mid'),
  ('rizz', 'rizz'),
  ('delulu', 'delulu'),
  ('lowkey', 'lowkey'),
  ('gyat', 'gyat'),
  ('girl dinner', 'girl-dinner'),
  ('ratio', 'ratio'),
  ('sigma', 'sigma'),
  ('skibidi', 'skibidi'),
  ('the ick', 'the-ick');

-- Insert some initial source rules for credible domains
INSERT INTO public.source_rules (domain, status) VALUES
  ('urbandictionary.com', 'allow'),
  ('merriam-webster.com', 'allow'),
  ('dictionary.com', 'allow'),
  ('cambridge.org', 'allow'),
  ('britannica.com', 'allow'),
  ('wikipedia.org', 'allow'),
  ('knowyourmeme.com', 'allow'),
  ('slang.org', 'allow');