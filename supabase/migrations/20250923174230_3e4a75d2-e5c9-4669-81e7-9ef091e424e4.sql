-- Fix the remaining functions that don't have search_path set correctly
-- These are the ones flagged by the security linter

-- Update anonymize_ip function
CREATE OR REPLACE FUNCTION public.anonymize_ip(ip_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Hash IP addresses for privacy while maintaining uniqueness for rate limiting
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return first 3 octets + hash of full IP for IPv4, or truncated hash for IPv6
  IF ip_address ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$' THEN
    -- IPv4: Keep first 3 octets, hash the last
    RETURN substring(ip_address from '^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}$') || '.xxx';
  ELSE
    -- IPv6 or other: Return truncated hash
    RETURN 'hash_' || substring(encode(digest(ip_address, 'sha256'), 'hex'), 1, 8);
  END IF;
END;
$$;

-- Update mask_sensitive_data function  
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF input_text IS NULL OR length(input_text) = 0 THEN
    RETURN input_text;
  END IF;
  
  -- Mask all but first and last character for emails and names
  IF length(input_text) <= 2 THEN
    RETURN repeat('*', length(input_text));
  ELSE
    RETURN left(input_text, 1) || repeat('*', length(input_text) - 2) || right(input_text, 1);
  END IF;
END;
$$;