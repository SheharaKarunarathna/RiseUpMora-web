-- database/20260803_timeslot_feature.sql
-- Adds IT/CS company categorization, candidate timeslot columns,
-- timeslot_bookings table, and company_slot_counts cache table.

BEGIN;

-- 1. Add is_it column to companies
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS is_it BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add timeslot columns to candidates (nullable — NULL when no company selected for that pref)
ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS pref_1_timeslot INT CHECK (pref_1_timeslot IN (1, 2, 3, 4)),
    ADD COLUMN IF NOT EXISTS pref_2_timeslot INT CHECK (pref_2_timeslot IN (1, 2, 3, 4));

-- 3. Timeslot bookings — tracks every candidate-company preference assignment
--    Pref 1 & 2: slot_number required, no_timeslot_selected = FALSE
--    Pref 3 & 4: slot_number NULL, no_timeslot_selected = TRUE
CREATE TABLE IF NOT EXISTS timeslot_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    slot_number INT CHECK (slot_number IN (1, 2, 3, 4)),
    preference_number INT NOT NULL CHECK (preference_number IN (1, 2, 3, 4)),
    no_timeslot_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, candidate_id, preference_number)
);

-- 4. Company slot counts — denormalized counter cache per company per slot
CREATE TABLE IF NOT EXISTS company_slot_counts (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    slot_number INT NOT NULL CHECK (slot_number IN (1, 2, 3, 4)),
    filled_count INT NOT NULL DEFAULT 0,
    max_limit INT NOT NULL DEFAULT 10,
    PRIMARY KEY (company_id, slot_number)
);

-- 5. Seed company_slot_counts for all existing companies that don't have entries yet
INSERT INTO company_slot_counts (company_id, slot_number, filled_count, max_limit)
SELECT c.id, s.slot_number, 0, CASE WHEN c.is_it THEN 10 ELSE 15 END
FROM companies c
CROSS JOIN (VALUES (1), (2), (3), (4)) AS s(slot_number)
WHERE NOT EXISTS (
    SELECT 1 FROM company_slot_counts csc
    WHERE csc.company_id = c.id AND csc.slot_number = s.slot_number
);

COMMIT;
