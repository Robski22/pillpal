# Complete Database Reset Instructions

## Step-by-Step Process

### Step 1: Delete Everything
1. Open Supabase Dashboard → SQL Editor
2. Open the file: `DELETE_EVERYTHING_AND_CLEAN.sql`
3. Copy all contents (Ctrl + A, Ctrl + C)
4. Paste into Supabase SQL Editor
5. Click "Run" (or Ctrl + Enter)
6. This will:
   - Delete all data from all tables
   - Delete all auth users
   - Remove unnecessary tables (`schedules`, `day_schedules`)

### Step 2: Delete Auth Users (if SQL didn't work)
If auth users weren't deleted:
1. Go to Supabase Dashboard → Authentication → Users
2. Select all users (checkbox at top)
3. Click "Delete"
4. Confirm deletion

### Step 3: Fix the System
1. Still in Supabase SQL Editor
2. Open the file: `FIX_DATABASE.sql`
3. Copy all contents (Ctrl + A, Ctrl + C)
4. Paste into Supabase SQL Editor
5. Click "Run" (or Ctrl + Enter)
6. This will:
   - Create trigger to auto-create user_profiles on signup
   - Create find_or_create_user_profile_by_email function
   - Set up RLS policies

### Step 4: Verify Everything Works
Run these queries in SQL Editor:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Verify all data is deleted (should all be 0)
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) as user_profiles,
  (SELECT COUNT(*) FROM public.profiles) as profiles;
```

### Step 5: Test Signup
1. Go to your app: `http://localhost:3000/login`
2. Click "Sign Up"
3. Enter your old email and password
4. Sign up
5. Check Supabase → Authentication → Users (should see your new user)
6. Check Supabase → Table Editor → user_profiles (should see entry with same email)

---

## Tables That Were Removed (Unnecessary)

- ❌ `schedules` - Not used in codebase
- ❌ `day_schedules` - Not used in codebase

## Tables That Remain (Required)

- ✅ `day_config` - Day schedules and time frame times
- ✅ `time_frame_medications` - Medications per time frame
- ✅ `dispense_history` - Dispense tracking
- ✅ `account_members` - Caregiver/account management
- ✅ `profiles` - User profiles (phone, emergency contact)
- ✅ `user_profiles` - User emails (links to auth.users)
- ✅ `pi_connection_config` - Raspberry Pi settings
- ✅ `servo_config` - Servo motor configuration
- ✅ `medications` - Medication list

---

## Quick Checklist

- [ ] Run `DELETE_EVERYTHING_AND_CLEAN.sql`
- [ ] Delete auth users manually (if needed)
- [ ] Run `FIX_DATABASE.sql`
- [ ] Verify trigger and function exist
- [ ] Test signup with old email
- [ ] Verify user_profiles entry is created automatically

---

## If Something Goes Wrong

1. Check Supabase Dashboard → Logs for errors
2. Verify tables exist: Go to Table Editor, check all required tables are there
3. Check RLS policies: Go to Authentication → Policies, verify policies exist
4. Try signup again and check browser console for errors

