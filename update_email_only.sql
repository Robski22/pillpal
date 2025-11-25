-- Update the allowed email (tables and policies already exist)
-- Just update the email value
UPDATE app_config 
SET config_value = 'estaciomark03@gmail.com', updated_at = NOW()
WHERE config_key = 'allowed_email';

-- If the email doesn't exist yet, insert it
INSERT INTO app_config (config_key, config_value)
VALUES ('allowed_email', 'estaciomark03@gmail.com')
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = NOW();


