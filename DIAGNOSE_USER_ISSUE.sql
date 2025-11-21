-- ============================================
-- Diagnose User Issue
-- Run this to check if your user exists
-- ============================================

-- Check all users in auth.users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Check if user_profiles entries match auth.users
SELECT 
  up.id as user_profile_id,
  up.email as user_profile_email,
  au.id as auth_user_id,
  au.email as auth_user_email,
  CASE 
    WHEN au.id IS NULL THEN 'MISSING IN AUTH.USERS'
    ELSE 'EXISTS'
  END as status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- Check what user_id is being used in day_config (if any records exist)
SELECT DISTINCT user_id 
FROM public.day_config 
WHERE user_id IS NOT NULL;

-- Check if those user_ids exist in auth.users
SELECT 
  dc.user_id,
  CASE 
    WHEN au.id IS NULL THEN 'DOES NOT EXIST IN AUTH.USERS'
    ELSE 'EXISTS'
  END as status
FROM (SELECT DISTINCT user_id FROM public.day_config WHERE user_id IS NOT NULL) dc
LEFT JOIN auth.users au ON dc.user_id = au.id;

