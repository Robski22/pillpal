# 🚨 Fix Email Access - Quick Steps

## The Problem
The `allowed_email` row doesn't exist in your database, and the RLS policy might be blocking reads.

## Solution - Run This SQL in Supabase

Copy and paste this **ENTIRE** SQL block into Supabase SQL Editor and run it:

```sql
-- Step 1: Insert/Update the allowed email (UPSERT)
INSERT INTO app_config (config_key, config_value, updated_at)
VALUES ('allowed_email', 'estaciomark03@gmail.com', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Step 2: Fix RLS policy to allow API reads
DROP POLICY IF EXISTS "Allow read for authenticated users" ON app_config;
CREATE POLICY "Allow read for app_config" ON app_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read for authenticated users" ON pi_registration;
CREATE POLICY "Allow read for pi_registration" ON pi_registration
  FOR SELECT USING (true);

-- Step 3: Verify
SELECT * FROM app_config WHERE config_key = 'allowed_email';
```

## What This Does

1. **INSERT/UPDATE**: Creates the `allowed_email` config with your email if it doesn't exist, or updates it if it does
2. **Fix RLS**: Changes the policy to allow reads (needed for the API to check email during login)
3. **Verify**: Shows you the config to confirm it worked

## After Running the SQL

1. **Refresh your login page**
2. **Try logging in with `estaciomark03@gmail.com`** → Should work now! ✅
3. **Try logging in with a different email** → Should be blocked ❌

## If It Still Doesn't Work

1. Check the results of the SELECT query - you should see your email
2. Check browser console (F12) for any errors
3. Make sure you've restarted your dev server after code changes
4. Check if `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local` file (optional, but helpful)

## Note About Service Role Key

I also updated the API to try using the service role key if available. This bypasses RLS and is more secure for server-side checks. If you want to use this:

1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` key (not the anon key!)
3. Add it to your `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
4. Restart your dev server

This is optional - the RLS policy fix should work on its own.


