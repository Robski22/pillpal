-- ============================================
-- DELETE EVERYTHING AND REMOVE UNNECESSARY TABLES
-- ⚠️ WARNING: This will delete ALL data and drop unnecessary tables!
-- Run this FIRST, then run FIX_DATABASE.sql
-- ============================================

-- ============================================
-- STEP 1: Delete all data from tables (in correct order)
-- Delete child tables first (tables that reference other tables)
-- Uses DO block to handle tables that might not exist
-- ============================================

DO $$
BEGIN
  -- Delete from tables that exist (ignore errors if table doesn't exist)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispense_history') THEN
    DELETE FROM public.dispense_history;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_frame_medications') THEN
    DELETE FROM public.time_frame_medications;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'day_config') THEN
    DELETE FROM public.day_config;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_members') THEN
    DELETE FROM public.account_members;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DELETE FROM public.profiles;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    DELETE FROM public.user_profiles;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_connection_config') THEN
    DELETE FROM public.pi_connection_config;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'servo_config') THEN
    DELETE FROM public.servo_config;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medications') THEN
    DELETE FROM public.medications;
  END IF;
END $$;

-- ============================================
-- STEP 2: Delete all auth users
-- ============================================

-- Delete all users from auth.users
DELETE FROM auth.users;

-- Note: If the above doesn't work due to permissions,
-- Go to Supabase Dashboard → Authentication → Users → Select All → Delete

-- ============================================
-- STEP 3: Drop unnecessary/unused tables
-- ============================================

-- Drop tables that are not used in the codebase
-- These are safe to remove if they exist:

-- Drop 'schedules' table if it exists (not found in codebase)
DROP TABLE IF EXISTS public.schedules CASCADE;

-- Drop 'day_schedules' table if it exists (not found in codebase)
DROP TABLE IF EXISTS public.day_schedules CASCADE;

-- ============================================
-- STEP 4: Verify everything is deleted
-- ============================================

-- Run these to verify all data is deleted (should all return 0):
-- SELECT COUNT(*) FROM auth.users;
-- SELECT COUNT(*) FROM public.user_profiles;
-- SELECT COUNT(*) FROM public.profiles;
-- SELECT COUNT(*) FROM public.account_members;
-- SELECT COUNT(*) FROM public.day_config;
-- SELECT COUNT(*) FROM public.time_frame_medications;
-- SELECT COUNT(*) FROM public.dispense_history;
-- SELECT COUNT(*) FROM public.pi_connection_config;
-- SELECT COUNT(*) FROM public.servo_config;
-- SELECT COUNT(*) FROM public.medications;

-- ============================================
-- STEP 5: Verify unnecessary tables are removed
-- ============================================

-- Check if unnecessary tables still exist (should return 0 rows):
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('schedules', 'day_schedules');

-- ============================================
-- AFTER RUNNING THIS SCRIPT:
-- ============================================
-- 1. Run FIX_DATABASE.sql to recreate triggers and functions
-- 2. Test signup with your old email
-- 3. Verify user_profiles entry is created automatically

