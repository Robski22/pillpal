-- Verify your setup - check if email is configured correctly
SELECT * FROM app_config WHERE config_key = 'allowed_email';

-- Check if Pi is registered
SELECT * FROM pi_registration;


