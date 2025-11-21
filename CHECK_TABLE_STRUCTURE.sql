-- ============================================
-- Check Table Structure - Run this FIRST
-- This will show you what columns exist in each table
-- ============================================

-- Check all columns in all tables
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'day_config', 
    'time_frame_medications', 
    'servo_config', 
    'profiles', 
    'account_members', 
    'dispense_history', 
    'pi_connection_config',
    'user_profiles'
  )
ORDER BY table_name, ordinal_position;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'day_config', 
    'time_frame_medications', 
    'servo_config', 
    'profiles', 
    'account_members', 
    'dispense_history', 
    'pi_connection_config',
    'user_profiles'
  )
ORDER BY table_name;

