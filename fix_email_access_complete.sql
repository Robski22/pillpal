-- Complete fix for email access issue
-- This will create the email config if it doesn't exist

-- Step 1: Insert/Update the allowed email (UPSERT)
INSERT INTO app_config (config_key, config_value, updated_at)
VALUES ('allowed_email', 'estaciomark03@gmail.com', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Step 2: Fix RLS policy to allow API reads (server-side needs to read this)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow read for authenticated users" ON app_config;

-- Create new policy that allows both authenticated users AND anon reads (for login check)
CREATE POLICY "Allow read for app_config" ON app_config
  FOR SELECT USING (true);

-- Also ensure pi_registration policy allows reads
DROP POLICY IF EXISTS "Allow read for authenticated users" ON pi_registration;

CREATE POLICY "Allow read for pi_registration" ON pi_registration
  FOR SELECT USING (true);

-- Step 3: Verify it worked
SELECT * FROM app_config WHERE config_key = 'allowed_email';


