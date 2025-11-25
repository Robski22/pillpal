-- Create table to store allowed email
CREATE TABLE IF NOT EXISTS app_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the allowed Gmail email (replace with your actual Gmail)
INSERT INTO app_config (config_key, config_value)
VALUES ('allowed_email', 'your-email@gmail.com')
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = NOW();

-- Create table to store Pi unique ID
CREATE TABLE IF NOT EXISTS pi_registration (
  id SERIAL PRIMARY KEY,
  pi_unique_id VARCHAR(255) UNIQUE NOT NULL,
  registered_email VARCHAR(255) NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_registration ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read for authenticated users)
CREATE POLICY "Allow read for authenticated users" ON app_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON pi_registration
  FOR SELECT USING (auth.role() = 'authenticated');


