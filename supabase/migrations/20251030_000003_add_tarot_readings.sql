-- Migration: Add tarot readings system
-- Run this in Supabase SQL Editor

-- Create tarot_readers table
CREATE TABLE IF NOT EXISTS public.tarot_readers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Create tarot_bookings table
CREATE TABLE IF NOT EXISTS public.tarot_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id uuid REFERENCES public.tarot_readers(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    package_type text NOT NULL CHECK (package_type IN ('quick', 'celtic')),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    payment_method text NOT NULL CHECK (payment_method IN ('venmo', 'cashapp', 'applepay', 'cash')),
    payment_status text NOT NULL CHECK (payment_status IN ('initiated', 'pending', 'confirmed', 'cash-pending', 'cash-confirmed')),
    amount numeric(10,2) NOT NULL,
    device_id text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Add RLS policies for tarot_readers
ALTER TABLE public.tarot_readers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tarot readers" ON public.tarot_readers
    FOR SELECT USING (true);

CREATE POLICY "Service role full access tarot readers" ON public.tarot_readers
    FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for tarot_bookings
ALTER TABLE public.tarot_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tarot bookings" ON public.tarot_bookings
    FOR SELECT USING (true);

CREATE POLICY "Service role full access tarot bookings" ON public.tarot_bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to get available tarot slots
CREATE OR REPLACE FUNCTION get_available_tarot_slots(
    p_reader_id uuid,
    p_package_type text
)
RETURNS TABLE (
    slot_start timestamptz,
    slot_end timestamptz
) AS $$
DECLARE
    v_reader RECORD;
    v_duration interval;
    v_current_time timestamptz;
BEGIN
    -- Get reader info
    SELECT * INTO v_reader FROM tarot_readers WHERE id = p_reader_id;
    
    -- Set duration based on package
    IF p_package_type = 'quick' THEN
        v_duration := interval '5 minutes';
    ELSE
        v_duration := interval '15 minutes';
    END IF;
    
    -- Generate all possible slots
    v_current_time := v_reader.starts_at;
    
    WHILE v_current_time + v_duration <= v_reader.ends_at LOOP
        -- Check if slot is available
        IF NOT EXISTS (
            SELECT 1 FROM tarot_bookings
            WHERE reader_id = p_reader_id
            AND (
                (starts_at < v_current_time + v_duration AND ends_at > v_current_time)
            )
        ) THEN
            slot_start := v_current_time;
            slot_end := v_current_time + v_duration;
            RETURN NEXT;
        END IF;
        
        v_current_time := v_current_time + v_duration;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
