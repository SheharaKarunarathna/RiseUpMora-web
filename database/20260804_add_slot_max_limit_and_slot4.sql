-- database/20260804_add_slot_max_limit_and_slot4.sql
-- Adds max_limit column to company_slot_counts, expands slot_number CHECK constraints to allow slot 4 (1..4),
-- populates default max_limit for existing company slots (preserving existing candidate bookings in slots 1, 2, 3),
-- and seeds slot 4 for all companies.

BEGIN;

-- 1. Update CHECK constraints for candidates table
ALTER TABLE candidates 
  DROP CONSTRAINT IF EXISTS candidates_pref_1_timeslot_check,
  DROP CONSTRAINT IF EXISTS candidates_pref_2_timeslot_check;

ALTER TABLE candidates 
  ADD CONSTRAINT candidates_pref_1_timeslot_check CHECK (pref_1_timeslot IN (1, 2, 3, 4)),
  ADD CONSTRAINT candidates_pref_2_timeslot_check CHECK (pref_2_timeslot IN (1, 2, 3, 4));

-- 2. Update CHECK constraint for timeslot_bookings table
ALTER TABLE timeslot_bookings
  DROP CONSTRAINT IF EXISTS timeslot_bookings_slot_number_check;

ALTER TABLE timeslot_bookings
  ADD CONSTRAINT timeslot_bookings_slot_number_check CHECK (slot_number IN (1, 2, 3, 4));

-- 3. Update CHECK constraint for company_slot_counts table
ALTER TABLE company_slot_counts
  DROP CONSTRAINT IF EXISTS company_slot_counts_slot_number_check;

ALTER TABLE company_slot_counts
  ADD CONSTRAINT company_slot_counts_slot_number_check CHECK (slot_number IN (1, 2, 3, 4));

-- 4. Add max_limit column to company_slot_counts if it doesn't exist
ALTER TABLE company_slot_counts
  ADD COLUMN IF NOT EXISTS max_limit INT NOT NULL DEFAULT 10;

-- 5. Backfill max_limit values for existing slots (1, 2, 3) to 10
UPDATE company_slot_counts csc
SET max_limit = 10
WHERE max_limit IS NULL OR max_limit = 0;

-- 6. Seed slot 4 for all companies if not present
INSERT INTO company_slot_counts (company_id, slot_number, filled_count, max_limit)
SELECT c.id, 4, 0, 10
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM company_slot_counts csc
    WHERE csc.company_id = c.id AND csc.slot_number = 4
);

COMMIT;
