-- ============================================
-- Fix User ID Issue - Temporary Solution
-- This temporarily disables the foreign key constraint
-- Run this if you're sure the user exists but constraint is blocking
-- ============================================

-- ============================================
-- OPTION 1: Temporarily disable foreign key constraint
-- ============================================

-- Drop the foreign key constraint temporarily
ALTER TABLE IF EXISTS public.day_config
  DROP CONSTRAINT IF EXISTS day_config_user_id_fkey;

-- Now you can insert with any user_id
-- After testing, re-add the constraint with:
-- ALTER TABLE public.day_config
--   ADD CONSTRAINT day_config_user_id_fkey
--   FOREIGN KEY (user_id)
--   REFERENCES auth.users(id)
--   ON DELETE CASCADE;

-- ============================================
-- OPTION 2: Make user_id nullable temporarily
-- ============================================

-- If user_id column exists but constraint is too strict:
-- ALTER TABLE public.day_config
--   ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- OPTION 3: Re-add constraint properly (after fixing user issue)
-- ============================================

-- First, verify your user exists:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then re-add the constraint:
-- ALTER TABLE public.day_config
--   ADD CONSTRAINT day_config_user_id_fkey
--   FOREIGN KEY (user_id)
--   REFERENCES auth.users(id)
--   ON DELETE CASCADE;

-- ============================================
-- RECOMMENDED: Drop constraint, test, then re-add
-- ============================================

-- Step 1: Drop constraint
ALTER TABLE IF EXISTS public.day_config
  DROP CONSTRAINT IF EXISTS day_config_user_id_fkey;

-- Step 2: Test your app - try adding medication
-- (The insert should work now)

-- Step 3: After it works, verify the user_id that was inserted:
-- SELECT DISTINCT user_id FROM public.day_config;

-- Step 4: Verify that user_id exists in auth.users:
-- SELECT id FROM auth.users WHERE id = 'your-user-id-from-step-3';

-- Step 5: If user exists, re-add the constraint:
-- ALTER TABLE public.day_config
--   ADD CONSTRAINT day_config_user_id_fkey
--   FOREIGN KEY (user_id)
--   REFERENCES auth.users(id)
--   ON DELETE CASCADE;

