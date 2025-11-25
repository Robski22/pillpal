# 🔒 Setup Single Gmail Account Restriction

This guide will help you restrict your web app to only accept a single Gmail account and add unique ID verification for both the Gmail account and Raspberry Pi.

## Overview

The system now includes:
- **Email Whitelist**: Only the configured Gmail account can sign up or log in
- **Pi Unique ID**: Each Raspberry Pi has a unique ID that must be registered
- **Automatic Verification**: The web app automatically verifies both email and Pi ID

## Step 1: Create Database Tables

**📝 Easy Method**: Copy and paste the SQL from `setup_single_email_restriction.sql` file directly into Supabase SQL Editor.

**Or manually**: In Supabase SQL Editor, run the following SQL (copy ONLY the SQL, not the markdown code blocks):

```sql
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
```

**⚠️ Important**: 
- Replace `'your-email@gmail.com'` with your actual Gmail address!
- When copying SQL, make sure to copy ONLY the SQL code, NOT the markdown code block markers (```sql and ```)

## Step 2: Update Allowed Email (if needed)

**📝 Easy Method**: Copy and paste the SQL from `update_allowed_email.sql` file directly into Supabase SQL Editor.

**Or manually**: To change the allowed email later, run in Supabase SQL Editor (copy ONLY the SQL, not the markdown):

```sql
UPDATE app_config 
SET config_value = 'new-email@gmail.com', updated_at = NOW()
WHERE config_key = 'allowed_email';
```

## Step 3: Get Pi Unique ID

The Pi will automatically generate its unique ID when the server starts. The ID is saved to `/home/justin/pillpal/pi_unique_id.txt`.

To manually check or get the Pi unique ID:

1. **SSH into your Raspberry Pi**
2. **Check if ID file exists**:
   ```bash
   cat /home/justin/pillpal/pi_unique_id.txt
   ```

3. **If file doesn't exist**, the server will generate it automatically on next start, OR you can generate it manually:
   ```bash
   # The server generates it from CPU serial number
   # You can also check it in the server logs when it starts
   ```

4. **View the ID from server logs**:
   ```bash
   journalctl -u pillpal -n 50 | grep "Pi unique ID"
   ```

## Step 4: Register Pi with Allowed Email

**📝 Easy Method**: Copy and paste the SQL from `register_pi.sql` file directly into Supabase SQL Editor, then replace the placeholders.

**Or manually**: Once you have the Pi unique ID, register it in Supabase SQL Editor (copy ONLY the SQL, not the markdown):

```sql
-- Register the Pi (replace with actual values)
INSERT INTO pi_registration (pi_unique_id, registered_email)
VALUES ('YOUR_PI_UNIQUE_ID_HERE', 'your-email@gmail.com')
ON CONFLICT (pi_unique_id) DO UPDATE 
SET registered_email = EXCLUDED.registered_email, last_seen = NOW();
```

**Example**:
```sql
INSERT INTO pi_registration (pi_unique_id, registered_email)
VALUES ('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 'john.doe@gmail.com')
ON CONFLICT (pi_unique_id) DO UPDATE 
SET registered_email = EXCLUDED.registered_email, last_seen = NOW();
```

## Step 5: How It Works

### Email Verification
- **On Login/Signup**: The app checks if the email matches the allowed email in `app_config`
- **On Page Load**: The app verifies the logged-in user's email is still allowed
- **If Not Allowed**: User is automatically signed out and redirected to login

### Pi ID Verification
- **On Connection**: When the web app connects to the Pi, it requests the Pi's unique ID
- **Automatic Check**: The Pi sends its unique ID, and the web app verifies it matches the registered ID for the logged-in user's email
- **Verification**: The system checks that the Pi ID is registered with the same email as the logged-in user

## Step 6: Testing

1. **Test Allowed Email**:
   - Try logging in with the allowed email → Should work ✅
   - Try logging in with a different email → Should be blocked ❌

2. **Test Pi ID Verification**:
   - Connect to the Pi with the allowed email → Should verify successfully ✅
   - Check browser console for "✅ Pi unique ID verified successfully"

3. **Test Unauthorized Access**:
   - If someone tries to use a different email, they'll be blocked at login
   - If someone tries to use a different Pi, verification will fail

## Step 7: Viewing Registered Pi

**📝 Easy Method**: Copy and paste the SQL from `check_registration.sql` file directly into Supabase SQL Editor.

**Or manually**: To see which Pi is registered and the allowed email (copy ONLY the SQL, not the markdown):

```sql
-- View the allowed email
SELECT * FROM app_config WHERE config_key = 'allowed_email';

-- View registered Pi
SELECT * FROM pi_registration;
```

## Troubleshooting

### "Email not authorized" error
- Check that your email is in `app_config` table
- Verify the email matches exactly (case-insensitive, but must match)

### "Pi not registered or email mismatch" error
- Check that the Pi unique ID is registered in `pi_registration` table
- Verify the `registered_email` matches your logged-in email
- Check Pi server logs to see what unique ID it's using

### Pi ID not generating
- Check that the Pi server has write permissions to `/home/justin/pillpal/`
- Check server logs for errors
- The ID is generated from CPU serial number, so it should be consistent

## Security Notes

- The email whitelist is enforced at both login and page load
- Pi ID verification happens automatically on connection
- Both checks must pass for full access
- The system logs verification attempts for debugging

