-- Migration: Update performance types and add song info for karaoke
-- Run this in Supabase SQL Editor

-- Step 1: Add song_info column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS song_info text;

-- Step 2: Drop the old enum type and create new one
-- First, alter the column to text temporarily
ALTER TABLE public.bookings ALTER COLUMN performance_type TYPE text;

-- Drop the old enum
DROP TYPE IF EXISTS performance_type CASCADE;

-- Create new enum with updated values
CREATE TYPE performance_type AS ENUM ('Comedy', 'Karaoke', 'Other');

-- Convert the column back to the new enum type
ALTER TABLE public.bookings ALTER COLUMN performance_type TYPE performance_type USING performance_type::performance_type;
