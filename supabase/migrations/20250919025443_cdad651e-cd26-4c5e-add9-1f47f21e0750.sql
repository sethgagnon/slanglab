-- Remove cached entry for term "67"
-- First delete sources that reference senses for this term
DELETE FROM sources WHERE sense_id IN (
  SELECT s.id FROM senses s WHERE s.term_id = 'f9a13ffc-45f2-442b-b53e-19c293a33f19'
);

-- Delete senses for this term
DELETE FROM senses WHERE term_id = 'f9a13ffc-45f2-442b-b53e-19c293a33f19';

-- Delete the term itself
DELETE FROM terms WHERE id = 'f9a13ffc-45f2-442b-b53e-19c293a33f19';