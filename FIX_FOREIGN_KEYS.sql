-- ============================================
-- Fix Foreign Key Constraints
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Check current foreign key constraints
-- ============================================

-- This will show all foreign keys (run to see what exists):
-- SELECT
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   tc.constraint_name
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND tc.table_name IN ('day_config', 'time_frame_medications', 'servo_config', 'profiles', 'account_members');

-- ============================================
-- STEP 2: Fix day_config foreign key constraint
-- ============================================

-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.day_config
  DROP CONSTRAINT IF EXISTS day_config_user_id_fkey;

-- Recreate foreign key with proper reference to auth.users
ALTER TABLE IF EXISTS public.day_config
  ADD CONSTRAINT day_config_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 3: Fix time_frame_medications foreign key constraints
-- ============================================

-- Drop existing foreign keys if they exist
ALTER TABLE IF EXISTS public.time_frame_medications
  DROP CONSTRAINT IF EXISTS time_frame_medications_user_id_fkey;

ALTER TABLE IF EXISTS public.time_frame_medications
  DROP CONSTRAINT IF EXISTS time_frame_medications_day_config_id_fkey;

-- Recreate foreign key for user_id
ALTER TABLE IF EXISTS public.time_frame_medications
  ADD CONSTRAINT time_frame_medications_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Recreate foreign key for day_config_id (if day_config table exists)
ALTER TABLE IF EXISTS public.time_frame_medications
  ADD CONSTRAINT time_frame_medications_day_config_id_fkey
  FOREIGN KEY (day_config_id)
  REFERENCES public.day_config(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 4: Fix servo_config foreign key constraint
-- ============================================

-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.servo_config
  DROP CONSTRAINT IF EXISTS servo_config_user_id_fkey;

-- Recreate foreign key with proper reference to auth.users
ALTER TABLE IF EXISTS public.servo_config
  ADD CONSTRAINT servo_config_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 5: Fix profiles foreign key constraint
-- ============================================

-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Recreate foreign key with proper reference to auth.users
ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 6: Fix account_members foreign key constraints
-- ============================================

-- Drop existing foreign keys if they exist
ALTER TABLE IF EXISTS public.account_members
  DROP CONSTRAINT IF EXISTS account_members_account_owner_id_fkey;

ALTER TABLE IF EXISTS public.account_members
  DROP CONSTRAINT IF EXISTS account_members_member_id_fkey;

-- Recreate foreign key for account_owner_id
ALTER TABLE IF EXISTS public.account_members
  ADD CONSTRAINT account_members_account_owner_id_fkey
  FOREIGN KEY (account_owner_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Recreate foreign key for member_id
ALTER TABLE IF EXISTS public.account_members
  ADD CONSTRAINT account_members_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 7: Fix dispense_history foreign key constraint
-- ============================================

-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.dispense_history
  DROP CONSTRAINT IF EXISTS dispense_history_user_id_fkey;

-- Recreate foreign key with proper reference to auth.users
ALTER TABLE IF EXISTS public.dispense_history
  ADD CONSTRAINT dispense_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 8: Fix pi_connection_config foreign key constraint
-- ============================================

-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.pi_connection_config
  DROP CONSTRAINT IF EXISTS pi_connection_config_user_id_fkey;

-- Recreate foreign key with proper reference to auth.users
ALTER TABLE IF EXISTS public.pi_connection_config
  ADD CONSTRAINT pi_connection_config_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- ============================================
-- STEP 9: Clean up orphaned records (optional)
-- ============================================

-- Delete records that reference non-existent users
-- (Only run this if you want to clean up orphaned data)

-- DELETE FROM public.day_config 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.time_frame_medications 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.servo_config 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.profiles 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.account_members 
-- WHERE account_owner_id NOT IN (SELECT id FROM auth.users)
--    OR member_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.dispense_history 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- DELETE FROM public.pi_connection_config 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- STEP 10: Verify foreign keys are set correctly
-- ============================================

-- Run this to verify all foreign keys are set:
-- SELECT
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND tc.table_name IN ('day_config', 'time_frame_medications', 'servo_config', 'profiles', 'account_members', 'dispense_history', 'pi_connection_config')
-- ORDER BY tc.table_name, kcu.column_name;

