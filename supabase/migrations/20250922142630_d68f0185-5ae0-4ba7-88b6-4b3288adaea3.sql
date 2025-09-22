-- =====================================================
-- IDEMPOTENT MIGRATION: Tracking Schema Implementation
-- =====================================================

-- Phase 1: Update existing terms table with missing columns
-- =====================================================

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'user_id') THEN
        ALTER TABLE public.terms ADD COLUMN user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE;
        -- Populate existing terms with a default user (first admin or create system user)
        UPDATE public.terms SET user_id = (
            SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1
        ) WHERE user_id IS NULL;
        -- Make it NOT NULL after populating
        ALTER TABLE public.terms ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Add original_text column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'original_text') THEN
        ALTER TABLE public.terms ADD COLUMN original_text TEXT;
        -- Populate with existing text value
        UPDATE public.terms SET original_text = text WHERE original_text IS NULL;
        ALTER TABLE public.terms ALTER COLUMN original_text SET NOT NULL;
    END IF;
END $$;

-- Add slug column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'slug') THEN
        ALTER TABLE public.terms ADD COLUMN slug TEXT;
        -- Generate slugs from normalized_text
        UPDATE public.terms SET slug = LOWER(REGEXP_REPLACE(normalized_text, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
        ALTER TABLE public.terms ALTER COLUMN slug SET NOT NULL;
    END IF;
END $$;

-- Create unique index on slug if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'terms' AND indexname = 'idx_terms_slug_unique') THEN
        CREATE UNIQUE INDEX idx_terms_slug_unique ON public.terms(slug);
    END IF;
END $$;

-- Phase 2: Create term_variants table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.term_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    variant_text TEXT NOT NULL,
    variant_type TEXT NOT NULL DEFAULT 'synonym', -- synonym, abbreviation, misspelling, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(term_id, variant_text)
);

-- Enable RLS on term_variants
ALTER TABLE public.term_variants ENABLE ROW LEVEL SECURITY;

-- Phase 3: Create trackers table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trackers (
    term_id UUID NOT NULL PRIMARY KEY REFERENCES public.terms(id) ON DELETE CASCADE,
    schedule_cron TEXT NOT NULL DEFAULT '0 */6 * * *', -- Every 6 hours by default
    sensitivity TEXT NOT NULL DEFAULT 'balanced', -- low, balanced, high
    sources_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trackers
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

-- Phase 4: Create sightings table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sightings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- reddit, tiktok, urbandictionary, etc.
    url TEXT NOT NULL,
    title TEXT,
    snippet TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'exact', -- exact, partial, context
    score INTEGER NOT NULL DEFAULT 0, -- relevance/confidence score 0-100
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    lang TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the requested unique index on (term_id, url)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'sightings' AND indexname = 'idx_sightings_term_url_unique') THEN
        CREATE UNIQUE INDEX idx_sightings_term_url_unique ON public.sightings(term_id, url);
    END IF;
END $$;

-- Enable RLS on sightings
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;

-- Phase 5: Create alerts table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    rule JSONB NOT NULL DEFAULT '{}'::jsonb, -- alert conditions and configuration
    threshold INTEGER NOT NULL DEFAULT 1, -- minimum score/count to trigger
    last_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(term_id, user_id) -- One alert rule per user per term
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Phase 6: Create performance indexes
-- =====================================================

-- Index for sightings queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'sightings' AND indexname = 'idx_sightings_term_id_score') THEN
        CREATE INDEX idx_sightings_term_id_score ON public.sightings(term_id, score DESC);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'sightings' AND indexname = 'idx_sightings_first_seen_at') THEN
        CREATE INDEX idx_sightings_first_seen_at ON public.sightings(first_seen_at DESC);
    END IF;
END $$;

-- Index for term_variants queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'term_variants' AND indexname = 'idx_term_variants_term_id') THEN
        CREATE INDEX idx_term_variants_term_id ON public.term_variants(term_id);
    END IF;
END $$;

-- Phase 7: Update RLS policies
-- =====================================================

-- Drop existing overly permissive policies on terms if they exist
DROP POLICY IF EXISTS "Anyone can view terms" ON public.terms;
DROP POLICY IF EXISTS "Authenticated users can create terms" ON public.terms;

-- Create new restrictive RLS policies for terms
CREATE POLICY "Users can view their own terms" ON public.terms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own terms" ON public.terms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own terms" ON public.terms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own terms" ON public.terms
    FOR DELETE USING (auth.uid() = user_id);

-- Admin bypass policy for terms
CREATE POLICY "Admins can manage all terms" ON public.terms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Keep public "published" behavior for public term pages (read-only)
CREATE POLICY "Anyone can view published terms" ON public.terms
    FOR SELECT USING (
        -- Add your published/public criteria here (e.g., is_published = true)
        true -- Placeholder - adjust based on your published terms logic
    );

-- RLS policies for term_variants
CREATE POLICY "Users can view their term variants" ON public.term_variants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = term_variants.term_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage their term variants" ON public.term_variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = term_variants.term_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all term variants" ON public.term_variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- RLS policies for trackers
CREATE POLICY "Users can view their trackers" ON public.trackers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = trackers.term_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can manage their trackers" ON public.trackers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = trackers.term_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all trackers" ON public.trackers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- RLS policies for sightings
CREATE POLICY "Users can view their sightings" ON public.sightings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = sightings.term_id AND user_id = auth.uid())
    );

CREATE POLICY "System can create sightings" ON public.sightings
    FOR INSERT WITH CHECK (true); -- Allows system/background jobs to insert

CREATE POLICY "Users can manage their sightings" ON public.sightings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.terms WHERE id = sightings.term_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all sightings" ON public.sightings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- RLS policies for alerts
CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" ON public.alerts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all alerts" ON public.alerts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Phase 8: Create update trigger for updated_at columns
-- =====================================================

-- Create or replace the update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables with updated_at columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trackers_updated_at') THEN
        CREATE TRIGGER update_trackers_updated_at
            BEFORE UPDATE ON public.trackers
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_alerts_updated_at') THEN
        CREATE TRIGGER update_alerts_updated_at
            BEFORE UPDATE ON public.alerts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;