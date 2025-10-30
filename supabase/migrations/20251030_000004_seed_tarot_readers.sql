-- Seed tarot readers for today's event
-- Run this after the migration

DO $$
DECLARE
    v_event_id uuid;
    v_today date := CURRENT_DATE;
BEGIN
    -- Get today's active event
    SELECT id INTO v_event_id FROM events WHERE active = true LIMIT 1;
    
    IF v_event_id IS NOT NULL THEN
        -- Insert Meeti (5:30PM-7:15PM)
        INSERT INTO tarot_readers (name, starts_at, ends_at, event_id)
        VALUES (
            'Meeti',
            (v_today + interval '17 hours 30 minutes')::timestamptz,
            (v_today + interval '19 hours 15 minutes')::timestamptz,
            v_event_id
        )
        ON CONFLICT DO NOTHING;
        
        -- Insert Caress The Goddess (7:30PM-9:00PM)
        INSERT INTO tarot_readers (name, starts_at, ends_at, event_id)
        VALUES (
            'Caress The Goddess',
            (v_today + interval '19 hours 30 minutes')::timestamptz,
            (v_today + interval '21 hours')::timestamptz,
            v_event_id
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Tarot readers seeded successfully';
    ELSE
        RAISE NOTICE 'No active event found - create an event first';
    END IF;
END $$;
