-- Update the current user's plan to 'pro' to enable share features
UPDATE profiles 
SET plan = 'pro'
WHERE user_id = auth.uid();