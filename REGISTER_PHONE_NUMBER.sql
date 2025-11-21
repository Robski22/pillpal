-- Register Phone Number for SMS Notifications
-- This script updates the phone_number in the profiles table
-- Replace 'YOUR_USER_ID' with your actual user ID (UUID from auth.users)

-- Option 1: Update by user email (recommended)
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles
SET 
  phone_number = '+639762549485',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);

-- Option 2: Update by user ID (if you know the UUID)
-- Replace 'YOUR_USER_ID' with your actual user ID
-- UPDATE profiles
-- SET 
--   phone_number = '+639762549485',
--   updated_at = NOW()
-- WHERE id = 'YOUR_USER_ID';

-- Option 3: Update all profiles (if you only have one user)
-- WARNING: This updates ALL users - use with caution!
-- UPDATE profiles
-- SET 
--   phone_number = '+639762549485',
--   updated_at = NOW();

-- Verify the update
SELECT 
  id,
  phone_number,
  updated_at
FROM profiles
WHERE phone_number = '+639762549485';

