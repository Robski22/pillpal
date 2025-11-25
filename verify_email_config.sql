-- Verify your email configuration
-- This will show you what email is currently allowed

SELECT * FROM app_config WHERE config_key = 'allowed_email';

-- If the email is wrong, update it:
-- UPDATE app_config 
-- SET config_value = 'estaciomark03@gmail.com', updated_at = NOW()
-- WHERE config_key = 'allowed_email';


