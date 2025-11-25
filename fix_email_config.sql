-- Fix email configuration - this will INSERT if it doesn't exist, or UPDATE if it does
-- Run this to ensure your email is set correctly

INSERT INTO app_config (config_key, config_value, updated_at)
VALUES ('allowed_email', 'estaciomark03@gmail.com', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Verify it was set correctly
SELECT * FROM app_config WHERE config_key = 'allowed_email';


