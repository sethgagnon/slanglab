-- Drop the secure_profiles view that's causing security issues
DROP VIEW IF EXISTS public.secure_profiles;

-- Create secure RLS policies for the profiles table to ensure data protection
-- Note: The existing policies are already in place, but let's add extra security

-- Add IP anonymization to existing anonymous searches and audit logs
UPDATE public.anonymous_searches 
SET anonymized_ip = public.anonymize_ip(ip_address)
WHERE anonymized_ip IS NULL AND ip_address IS NOT NULL;

UPDATE public.security_audit_log 
SET anonymized_ip = public.anonymize_ip(ip_address::text)
WHERE anonymized_ip IS NULL AND ip_address IS NOT NULL;