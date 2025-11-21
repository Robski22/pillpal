-- ============================================
-- PillPal Database Fix Script
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Fix Signup - Auto-create user_profiles
-- ============================================

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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Create find_or_create_user_profile_by_email function
-- ============================================

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

-- ============================================
-- 3. Fix existing users - Create missing user_profiles entries
-- ============================================

INSERT INTO public.user_profiles (id, email)
SELECT id, email 
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. RLS Policies for user_profiles
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

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

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- 5. Verify Tables Exist (Check)
-- ============================================

-- Run these to check if tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--   'day_config',
--   'time_frame_medications',
--   'dispense_history',
--   'account_members',
--   'profiles',
--   'user_profiles',
--   'pi_connection_config',
--   'servo_config',
--   'medications'
-- );

-- ============================================
-- 6. Test Queries (Run separately to verify)
-- ============================================

-- Check trigger is working:
-- SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 5;

-- Check function works:
-- SELECT * FROM find_or_create_user_profile_by_email('test@example.com');

-- Check table counts:
-- SELECT 
--   (SELECT COUNT(*) FROM day_config) as day_config_count,
--   (SELECT COUNT(*) FROM time_frame_medications) as medications_count,
--   (SELECT COUNT(*) FROM dispense_history) as history_count,
--   (SELECT COUNT(*) FROM account_members) as members_count,
--   (SELECT COUNT(*) FROM profiles) as profiles_count,
--   (SELECT COUNT(*) FROM user_profiles) as user_profiles_count;

