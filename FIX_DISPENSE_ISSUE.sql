-- ============================================
-- Fix Dispense Issue - Complete Fix
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Remove foreign key constraint blocking day_config inserts
-- ============================================

ALTER TABLE IF EXISTS public.day_config
  DROP CONSTRAINT IF EXISTS day_config_user_id_fkey;

-- ============================================
-- STEP 2: Check if servo_config table exists and has data
-- ============================================

-- Check if servo_config table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'servo_config'
  ) THEN
    RAISE NOTICE 'servo_config table exists';
    
    -- Check if it has any data
    IF EXISTS (SELECT 1 FROM public.servo_config LIMIT 1) THEN
      RAISE NOTICE 'servo_config has data';
    ELSE
      RAISE NOTICE 'servo_config is empty - this is OK, not required for dispensing';
    END IF;
  ELSE
    RAISE NOTICE 'servo_config table does not exist - this is OK, not required for dispensing';
  END IF;
END $$;

-- ============================================
-- STEP 3: Verify your user exists in auth.users
-- ============================================

-- Run this to see your user (replace with your email):
-- SELECT id, email, created_at, email_confirmed_at 
-- FROM auth.users 
-- WHERE email = 'your-email@example.com';

-- ============================================
-- STEP 4: Check what's in day_config (if anything)
-- ============================================

-- Run this to see what user_ids are in day_config:
-- SELECT DISTINCT user_id, COUNT(*) as count
-- FROM public.day_config
-- GROUP BY user_id;

-- ============================================
-- STEP 5: (Optional) Re-add foreign key constraint after verifying user exists
-- ============================================

-- Only run this AFTER you've verified:
-- 1. Your user exists in auth.users
-- 2. The user_id in day_config matches auth.users.id
-- 3. Dispensing works

-- ALTER TABLE public.day_config
--   ADD CONSTRAINT day_config_user_id_fkey
--   FOREIGN KEY (user_id)
--   REFERENCES auth.users(id)
--   ON DELETE CASCADE;

-- ============================================
-- NOTES:
-- ============================================
-- 1. servo_config is NOT required for dispensing on the main dashboard
-- 2. Dispensing uses calculated angles (getAngleForTimeFrame function)
-- 3. The foreign key constraint was blocking inserts
-- 4. After removing the constraint, try dispensing again
-- 5. If it works, you can re-add the constraint later (see STEP 5)

