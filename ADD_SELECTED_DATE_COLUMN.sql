-- ============================================
-- Add selected_date column to day_config table
-- This allows dates to sync between patient and caregiver
-- Run this in Supabase SQL Editor
-- ============================================

-- Add selected_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'day_config' 
    AND column_name = 'selected_date'
  ) THEN
    ALTER TABLE public.day_config 
    ADD COLUMN selected_date DATE;
    
    RAISE NOTICE 'Added selected_date column to day_config table';
  ELSE
    RAISE NOTICE 'selected_date column already exists in day_config table';
  END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN public.day_config.selected_date IS 'The selected date for this day schedule (synced between patient and caregiver)';

