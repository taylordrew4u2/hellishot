-- Restructure scheduling: Single continuous performance block and 4 rotating tarot blocks
-- Keep all payment fields and logic unchanged

-- Step 1: Delete old test bookings and old blocks
DELETE FROM bookings WHERE event_id = (SELECT id FROM events WHERE active = true);
DELETE FROM tarot_bookings WHERE reader_id IN (SELECT id FROM tarot_readers WHERE event_id = (SELECT id FROM events WHERE active = true));
DELETE FROM blocks WHERE event_id = (SELECT id FROM events WHERE active = true);
DELETE FROM tarot_readers WHERE event_id = (SELECT id FROM events WHERE active = true);

-- Step 2: Update event times to 5:30PM-12:00AM (22:30-04:00 UTC)
UPDATE events 
SET 
  starts_at = '2025-10-30T22:30:00+00:00',
  ends_at = '2025-10-31T04:00:00+00:00',
  updated_at = now()
WHERE active = true;

-- Step 3: Create single continuous performance block (no more multiple blocks)
-- The system will auto-assign sequential slots and calculate break times
INSERT INTO blocks (event_id, name, starts_at, ends_at, capacity, position)
SELECT 
  id,
  'Performance Queue',
  '2025-10-30T22:30:00+00:00',
  '2025-10-31T04:00:00+00:00',
  200,  -- Large capacity for continuous queue
  1
FROM events WHERE active = true;

-- Step 4: Create 4 rotating tarot blocks
-- Block 1: 5:30-7:20PM (22:30-00:20 UTC) - Meeti
-- Block 2: 7:30-9:20PM (00:30-02:20 UTC) - Caress The Goddess  
-- Block 3: 9:30-11:20PM (02:30-04:20 UTC) - Meeti
-- Block 4: 11:30PM-12:00AM (04:30-05:00 UTC) - Caress The Goddess

-- Note: Added block_number column to tarot_readers to track rotation
ALTER TABLE tarot_readers ADD COLUMN IF NOT EXISTS block_number INTEGER;

INSERT INTO tarot_readers (event_id, name, starts_at, ends_at, block_number)
SELECT 
  id,
  'Meeti',
  '2025-10-30T22:30:00+00:00',
  '2025-10-31T00:20:00+00:00',
  1
FROM events WHERE active = true;

INSERT INTO tarot_readers (event_id, name, starts_at, ends_at, block_number)
SELECT 
  id,
  'Caress The Goddess',
  '2025-10-31T00:30:00+00:00',
  '2025-10-31T02:20:00+00:00',
  2
FROM events WHERE active = true;

INSERT INTO tarot_readers (event_id, name, starts_at, ends_at, block_number)
SELECT 
  id,
  'Meeti',
  '2025-10-31T02:30:00+00:00',
  '2025-10-31T04:20:00+00:00',
  3
FROM events WHERE active = true;

INSERT INTO tarot_readers (event_id, name, starts_at, ends_at, block_number)
SELECT 
  id,
  'Caress The Goddess',
  '2025-10-31T04:30:00+00:00',
  '2025-10-31T05:00:00+00:00',
  4
FROM events WHERE active = true;

-- Step 5: Add approximate_time field to bookings for queue position display
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approximate_time TIMESTAMPTZ;

-- All payment fields remain unchanged (payment_method, payment_status, wants_video, amount, etc.)
