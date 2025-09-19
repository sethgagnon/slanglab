-- Add creation_type column to creations table to distinguish between AI and manual creations
ALTER TABLE public.creations 
ADD COLUMN creation_type text NOT NULL DEFAULT 'ai' CHECK (creation_type IN ('ai', 'manual'));

-- Add manual_generations_used column to limits table to track manual creations separately
ALTER TABLE public.limits 
ADD COLUMN manual_generations_used integer NOT NULL DEFAULT 0;

-- Update existing creations to be marked as 'ai' type (they are already defaulted, but for clarity)
UPDATE public.creations SET creation_type = 'ai' WHERE creation_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.creations.creation_type IS 'Type of creation: ai (AI-generated) or manual (user-created)';
COMMENT ON COLUMN public.limits.manual_generations_used IS 'Number of manual slang creations used in the current period';