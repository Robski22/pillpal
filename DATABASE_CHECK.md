# Database Check and Fix Guide

## Tables Currently Used in Application

### ✅ **REQUIRED TABLES** (Actively Used):

1. **`day_config`** - Stores day schedules and time frame times
   - Used in: `app/page.tsx` (main dashboard)
   - Columns needed: `id`, `user_id`, `day_of_week`, `morning_time`, `afternoon_time`, `evening_time`, `selected_date`, `created_at`, `updated_at`

2. **`time_frame_medications`** - Stores medications per time frame
   - Used in: `app/page.tsx` (main dashboard)
   - Columns needed: `id`, `user_id`, `day_config_id`, `day_of_week`, `medication_name`, `time_frame`, `is_active`, `created_at`, `updated_at`

3. **`dispense_history`** - Tracks medication dispense history
   - Used in: `app/page.tsx`, `app/history/page.tsx`
   - Columns needed: `id`, `user_id`, `medication_name`, `day_of_week`, `time_frame`, `dispensed_at`, `created_at`

4. **`account_members`** - Manages caregiver/account members
   - Used in: `app/page.tsx`, `app/profile/page.tsx`
   - Columns needed: `id`, `account_owner_id`, `member_id`, `role`, `status`, `created_at`, `updated_at`

5. **`profiles`** - User profile information (phone, emergency contact)
   - Used in: `app/page.tsx` (for SMS), `app/profile/page.tsx`
   - Columns needed: `id`, `user_id`, `phone_number`, `emergency_contact`, `created_at`, `updated_at`

6. **`user_profiles`** - Stores user emails (links auth.users to profiles)
   - Used in: `app/profile/page.tsx`
   - Columns needed: `id` (uuid, references auth.users.id), `email`, `created_at`, `updated_at`

7. **`pi_connection_config`** - Raspberry Pi connection settings
   - Used in: `app/api/pi-url/route.ts`
   - Columns needed: `id`, `user_id`, `pi_url`, `created_at`, `updated_at`

8. **`servo_config`** - Servo motor configuration
   - Used in: `app/schedule/page.tsx`, `app/medications/page.tsx`
   - Columns needed: `id`, `user_id`, `servo_angle`, `created_at`, `updated_at`

9. **`medications`** - Medication list (if used separately)
   - Used in: `app/medications/page.tsx`
   - Columns needed: `id`, `user_id`, `medication_name`, `created_at`, `updated_at`

### ❌ **POTENTIALLY UNUSED TABLES** (Check if needed):

1. **`schedules`** - Not found in codebase, might be legacy
2. **`day_schedules`** - Not found in codebase, might be legacy

---

## Database Issues and Fixes

### 🔴 **Issue 1: Signup Not Creating Profile**

**Problem:** When users sign up, no profile is created in `user_profiles` table.

**Solution:** Create a database trigger to auto-create `user_profiles` entry when a user signs up.

**SQL to run in Supabase SQL Editor:**

```sql
-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 🔴 **Issue 2: Forgot Password Not Working**

**Problem:** Password reset emails might not be sending.

**Checklist:**
1. ✅ Go to Supabase Dashboard → Authentication → Email Templates
2. ✅ Check "Reset Password" template exists
3. ✅ Verify email provider is configured (SMTP settings)
4. ✅ Check "Redirect URL" in Authentication → URL Configuration:
   - Add: `http://localhost:3000/reset-password` (for localhost)
   - Add: `https://yourdomain.com/reset-password` (for production)

**SQL to verify email settings:**
```sql
-- Check if email templates exist (run in Supabase SQL Editor)
SELECT * FROM auth.email_templates WHERE name = 'reset_password';
```

### 🔴 **Issue 3: Missing Database Function**

**Problem:** `find_or_create_user_profile_by_email` function might not exist.

**Solution:** Create the function if missing:

```sql
-- Create function to find or create user profile by email
CREATE OR REPLACE FUNCTION public.find_or_create_user_profile_by_email(email_search TEXT)
RETURNS TABLE(user_id UUID, created BOOLEAN) AS $$
DECLARE
  found_user_id UUID;
  was_created BOOLEAN := false;
BEGIN
  -- First, try to find user in auth.users
  SELECT id INTO found_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(email_search)
  LIMIT 1;
  
  IF found_user_id IS NULL THEN
    -- User doesn't exist
    RETURN;
  END IF;
  
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = found_user_id) THEN
    -- Create profile entry
    INSERT INTO public.user_profiles (id, email)
    VALUES (found_user_id, email_search)
    ON CONFLICT (id) DO NOTHING;
    was_created := true;
  END IF;
  
  RETURN QUERY SELECT found_user_id, was_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Required RLS (Row Level Security) Policies

### **user_profiles table:**
```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

### **day_config table:**
```sql
-- Allow users to read their own day configs
CREATE POLICY "Users can read own day_config"
ON public.day_config
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert/update their own day configs
CREATE POLICY "Users can manage own day_config"
ON public.day_config
FOR ALL
USING (auth.uid() = user_id);
```

### **time_frame_medications table:**
```sql
-- Allow users to read their own medications
CREATE POLICY "Users can read own medications"
ON public.time_frame_medications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to manage their own medications
CREATE POLICY "Users can manage own medications"
ON public.time_frame_medications
FOR ALL
USING (auth.uid() = user_id);
```

### **profiles table:**
```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to manage their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = user_id);
```

---

## How to Test Database on Localhost

### 1. **Check Supabase Connection:**
```typescript
// In browser console (on localhost:3000)
// Open DevTools → Console, then run:
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Test connection
supabase.from('day_config').select('count').then(console.log)
```

### 2. **Test Signup:**
1. Go to `http://localhost:3000/login`
2. Click "Sign Up"
3. Enter email and password
4. Check Supabase Dashboard → Authentication → Users
5. Check `user_profiles` table - should have new entry

### 3. **Test Forgot Password:**
1. Go to `http://localhost:3000/login`
2. Enter email
3. Click "Forgot password?"
4. Check email inbox
5. Click link in email
6. Should redirect to `/reset-password`

### 4. **Test Database Queries:**
Run in Supabase SQL Editor:

```sql
-- Check if user_profiles trigger works
SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 5;

-- Check if tables have data
SELECT COUNT(*) FROM day_config;
SELECT COUNT(*) FROM time_frame_medications;
SELECT COUNT(*) FROM dispense_history;
SELECT COUNT(*) FROM account_members;
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM user_profiles;
```

---

## Quick Fix Checklist

- [ ] Run the `handle_new_user()` trigger SQL
- [ ] Run the `find_or_create_user_profile_by_email` function SQL
- [ ] Check RLS policies are enabled on all tables
- [ ] Verify email templates in Supabase Dashboard
- [ ] Check redirect URLs in Authentication settings
- [ ] Test signup flow
- [ ] Test forgot password flow
- [ ] Verify `user_profiles` entries are created automatically

---

## Tables Summary

**Keep these tables:**
- ✅ `day_config`
- ✅ `time_frame_medications`
- ✅ `dispense_history`
- ✅ `account_members`
- ✅ `profiles`
- ✅ `user_profiles`
- ✅ `pi_connection_config`
- ✅ `servo_config`
- ✅ `medications` (if used)

**Consider removing (if not used):**
- ❓ `schedules` (check if used)
- ❓ `day_schedules` (check if used)

---

## Next Steps

1. Run the SQL fixes above in Supabase SQL Editor
2. Test signup and forgot password on localhost
3. Check Supabase Dashboard → Logs for any errors
4. Verify all tables have proper RLS policies
5. Test the full authentication flow

