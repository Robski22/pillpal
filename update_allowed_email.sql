-- Update the allowed email (replace with your actual Gmail)
UPDATE app_config 
SET config_value = 'your-email@gmail.com', updated_at = NOW()
WHERE config_key = 'allowed_email';


