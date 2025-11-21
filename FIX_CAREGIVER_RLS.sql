-- ============================================
-- Fix RLS Policies for Caregivers
-- This allows caregivers to read owner's data
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Fix day_config RLS - Allow caregivers to read owner's data
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own day_config" ON public.day_config;
DROP POLICY IF EXISTS "Users can manage own day_config" ON public.day_config;
DROP POLICY IF EXISTS "Caregivers can read owner day_config" ON public.day_config;

-- Allow users to read their own day_config
CREATE POLICY "Users can read own day_config"
ON public.day_config
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Allow caregivers to read owner's day_config
CREATE POLICY "Caregivers can read owner day_config"
ON public.day_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = day_config.user_id
    AND status = 'accepted'
  )
);

-- Allow users to manage their own day_config
CREATE POLICY "Users can manage own day_config"
ON public.day_config
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow caregivers to manage owner's day_config
CREATE POLICY "Caregivers can manage owner day_config"
ON public.day_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = day_config.user_id
    AND status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = day_config.user_id
    AND status = 'accepted'
  )
);

-- ============================================
-- 2. Fix time_frame_medications RLS - Allow caregivers to read owner's medications
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own medications" ON public.time_frame_medications;
DROP POLICY IF EXISTS "Users can manage own medications" ON public.time_frame_medications;
DROP POLICY IF EXISTS "Caregivers can read owner medications" ON public.time_frame_medications;

-- Allow users to read their own medications
CREATE POLICY "Users can read own medications"
ON public.time_frame_medications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.day_config
    WHERE day_config.id = time_frame_medications.day_config_id
    AND day_config.user_id = auth.uid()
  )
);

-- Allow caregivers to read owner's medications
CREATE POLICY "Caregivers can read owner medications"
ON public.time_frame_medications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.day_config
    JOIN public.account_members ON account_members.owner_user_id = day_config.user_id
    WHERE day_config.id = time_frame_medications.day_config_id
    AND account_members.member_user_id = auth.uid()
    AND account_members.status = 'accepted'
  )
);

-- Allow users to manage their own medications
CREATE POLICY "Users can manage own medications"
ON public.time_frame_medications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.day_config
    WHERE day_config.id = time_frame_medications.day_config_id
    AND day_config.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.day_config
    WHERE day_config.id = time_frame_medications.day_config_id
    AND day_config.user_id = auth.uid()
  )
);

-- Allow caregivers to manage owner's medications
CREATE POLICY "Caregivers can manage owner medications"
ON public.time_frame_medications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.day_config
    JOIN public.account_members ON account_members.owner_user_id = day_config.user_id
    WHERE day_config.id = time_frame_medications.day_config_id
    AND account_members.member_user_id = auth.uid()
    AND account_members.status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.day_config
    JOIN public.account_members ON account_members.owner_user_id = day_config.user_id
    WHERE day_config.id = time_frame_medications.day_config_id
    AND account_members.member_user_id = auth.uid()
    AND account_members.status = 'accepted'
  )
);

-- ============================================
-- 3. Fix dispense_history RLS - Allow caregivers to read owner's history
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own history" ON public.dispense_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.dispense_history;
DROP POLICY IF EXISTS "Caregivers can read owner history" ON public.dispense_history;

-- Allow users to read their own history
CREATE POLICY "Users can read own history"
ON public.dispense_history
FOR SELECT
USING (auth.uid() = user_id);

-- Allow caregivers to read owner's history
CREATE POLICY "Caregivers can read owner history"
ON public.dispense_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = dispense_history.user_id
    AND status = 'accepted'
  )
);

-- Allow users to insert their own history
CREATE POLICY "Users can insert own history"
ON public.dispense_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow caregivers to insert owner's history (when they dispense for owner)
CREATE POLICY "Caregivers can insert owner history"
ON public.dispense_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = dispense_history.user_id
    AND status = 'accepted'
  )
);

-- ============================================
-- 4. Fix profiles RLS - Allow caregivers to read owner's profile
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Caregivers can read owner profile" ON public.profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow caregivers to read owner's profile
CREATE POLICY "Caregivers can read owner profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = auth.uid()
    AND owner_user_id = profiles.id
    AND status = 'accepted'
  )
);

-- Allow users to manage their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. Verify RLS is enabled
-- ============================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.day_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_frame_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispense_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Test Query (Run separately to verify)
-- ============================================

-- Test as caregiver (replace with actual caregiver user_id):
-- This should return owner's day_configs if RLS is working
-- SELECT * FROM day_config WHERE user_id = '<owner_user_id>';

