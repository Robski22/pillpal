-- ============================================
-- Fix Foreign Key Constraints (Safe Version)
-- Checks if columns exist before adding foreign keys
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Check what columns exist in each table
-- ============================================

-- Run this first to see what columns exist (uncomment to run):
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('day_config', 'time_frame_medications', 'servo_config', 'profiles', 'account_members', 'dispense_history', 'pi_connection_config')
-- ORDER BY table_name, ordinal_position;

-- ============================================
-- STEP 2: Fix day_config foreign key constraint
-- ============================================

DO $$
BEGIN
  -- Only add foreign key if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'day_config' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop existing foreign key if it exists
    ALTER TABLE public.day_config
      DROP CONSTRAINT IF EXISTS day_config_user_id_fkey;
    
    -- Recreate foreign key with proper reference to auth.users
    ALTER TABLE public.day_config
      ADD CONSTRAINT day_config_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed day_config.user_id foreign key';
  ELSE
    RAISE NOTICE 'day_config.user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix time_frame_medications foreign key constraints
-- ============================================

DO $$
BEGIN
  -- Fix user_id foreign key if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_frame_medications' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.time_frame_medications
      DROP CONSTRAINT IF EXISTS time_frame_medications_user_id_fkey;
    
    ALTER TABLE public.time_frame_medications
      ADD CONSTRAINT time_frame_medications_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed time_frame_medications.user_id foreign key';
  ELSE
    RAISE NOTICE 'time_frame_medications.user_id column does not exist - skipping';
  END IF;
  
  -- Fix day_config_id foreign key if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'time_frame_medications' 
    AND column_name = 'day_config_id'
  ) THEN
    ALTER TABLE public.time_frame_medications
      DROP CONSTRAINT IF EXISTS time_frame_medications_day_config_id_fkey;
    
    ALTER TABLE public.time_frame_medications
      ADD CONSTRAINT time_frame_medications_day_config_id_fkey
      FOREIGN KEY (day_config_id)
      REFERENCES public.day_config(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed time_frame_medications.day_config_id foreign key';
  ELSE
    RAISE NOTICE 'time_frame_medications.day_config_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 4: Fix servo_config foreign key constraint
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'servo_config' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.servo_config
      DROP CONSTRAINT IF EXISTS servo_config_user_id_fkey;
    
    ALTER TABLE public.servo_config
      ADD CONSTRAINT servo_config_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed servo_config.user_id foreign key';
  ELSE
    RAISE NOTICE 'servo_config.user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 5: Fix profiles foreign key constraint
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles
      DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
    
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed profiles.user_id foreign key';
  ELSE
    RAISE NOTICE 'profiles.user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 6: Fix account_members foreign key constraints
-- ============================================

DO $$
BEGIN
  -- Fix account_owner_id foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'account_members' 
    AND column_name = 'account_owner_id'
  ) THEN
    ALTER TABLE public.account_members
      DROP CONSTRAINT IF EXISTS account_members_account_owner_id_fkey;
    
    ALTER TABLE public.account_members
      ADD CONSTRAINT account_members_account_owner_id_fkey
      FOREIGN KEY (account_owner_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed account_members.account_owner_id foreign key';
  ELSE
    RAISE NOTICE 'account_members.account_owner_id column does not exist - skipping';
  END IF;
  
  -- Fix member_id foreign key (might be member_user_id instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'account_members' 
    AND column_name = 'member_id'
  ) THEN
    ALTER TABLE public.account_members
      DROP CONSTRAINT IF EXISTS account_members_member_id_fkey;
    
    ALTER TABLE public.account_members
      ADD CONSTRAINT account_members_member_id_fkey
      FOREIGN KEY (member_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed account_members.member_id foreign key';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'account_members' 
    AND column_name = 'member_user_id'
  ) THEN
    ALTER TABLE public.account_members
      DROP CONSTRAINT IF EXISTS account_members_member_user_id_fkey;
    
    ALTER TABLE public.account_members
      ADD CONSTRAINT account_members_member_user_id_fkey
      FOREIGN KEY (member_user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed account_members.member_user_id foreign key';
  ELSE
    RAISE NOTICE 'account_members member_id/member_user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 7: Fix dispense_history foreign key constraint
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dispense_history' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.dispense_history
      DROP CONSTRAINT IF EXISTS dispense_history_user_id_fkey;
    
    ALTER TABLE public.dispense_history
      ADD CONSTRAINT dispense_history_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed dispense_history.user_id foreign key';
  ELSE
    RAISE NOTICE 'dispense_history.user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 8: Fix pi_connection_config foreign key constraint
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pi_connection_config' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.pi_connection_config
      DROP CONSTRAINT IF EXISTS pi_connection_config_user_id_fkey;
    
    ALTER TABLE public.pi_connection_config
      ADD CONSTRAINT pi_connection_config_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed pi_connection_config.user_id foreign key';
  ELSE
    RAISE NOTICE 'pi_connection_config.user_id column does not exist - skipping';
  END IF;
END $$;

-- ============================================
-- STEP 9: Verify foreign keys are set correctly
-- ============================================

-- Run this to see all foreign keys that were created:
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
--   AND tc.table_name IN ('day_config', 'time_frame_medications', 'servo_config', 'profiles', 'account_members', 'dispense_history', 'pi_connection_config')
-- ORDER BY tc.table_name, kcu.column_name;

