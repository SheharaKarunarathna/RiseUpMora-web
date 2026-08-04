-- database/20260804_add_interviewed_column.sql
-- Adds is_interviewed column to timeslot_bookings and candidates tables to track interview status per candidate per company.

BEGIN;

ALTER TABLE timeslot_bookings
    ADD COLUMN IF NOT EXISTS is_interviewed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS is_interviewed BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
