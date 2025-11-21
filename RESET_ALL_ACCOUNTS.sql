-- ============================================
-- RESET ALL ACCOUNTS - DELETE EVERYTHING
-- ⚠️ WARNING: This will delete ALL data!
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Delete all data from tables (in correct order)
-- ============================================

-- Delete from child tables first (tables that reference other tables)
DELETE FROM public.dispense_history;
DELETE FROM public.time_frame_medications;
DELETE FROM public.day_config;
DELETE FROM public.account_members;
DELETE FROM public.profiles;
DELETE FROM public.user_profiles;
DELETE FROM public.pi_connection_config;
DELETE FROM public.servo_config;
DELETE FROM public.medications;

-- ============================================
-- STEP 2: Delete all auth users
-- ⚠️ This requires elevated permissions
-- ============================================

-- Delete all users from auth.users
-- Note: This might require service_role key or admin access
DELETE FROM auth.users;

-- Alternative if above doesn't work (run in Supabase Dashboard):
-- Go to Authentication → Users → Select All → Delete

-- ============================================
-- STEP 3: Reset sequences (optional, for clean IDs)
-- ============================================

-- Reset auto-increment sequences (if using serial/bigserial)
-- Uncomment these if you want to reset ID counters:

-- ALTER SEQUENCE IF EXISTS public.day_config_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.time_frame_medications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.dispense_history_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.account_members_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.pi_connection_config_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.servo_config_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS public.medications_id_seq RESTART WITH 1;

-- ============================================
-- STEP 4: Verify everything is deleted
-- ============================================

-- Run these to verify all data is deleted:
-- SELECT COUNT(*) FROM auth.users; -- Should be 0
-- SELECT COUNT(*) FROM public.user_profiles; -- Should be 0
-- SELECT COUNT(*) FROM public.profiles; -- Should be 0
-- SELECT COUNT(*) FROM public.account_members; -- Should be 0
-- SELECT COUNT(*) FROM public.day_config; -- Should be 0
-- SELECT COUNT(*) FROM public.time_frame_medications; -- Should be 0
-- SELECT COUNT(*) FROM public.dispense_history; -- Should be 0

-- ============================================
-- AFTER RESET: Re-run FIX_DATABASE.sql
-- ============================================

-- After deleting everything, run FIX_DATABASE.sql again to:
-- 1. Recreate the trigger for auto-creating user_profiles
-- 2. Recreate the find_or_create_user_profile_by_email function
-- 3. Set up RLS policies

