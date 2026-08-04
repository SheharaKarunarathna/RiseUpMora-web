-- database/20260804_add_candidate_status_default.sql
-- Migration to add status column with default 'Registered' to candidates table.

BEGIN;

ALTER TABLE candidates 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Registered';

-- Backfill any existing NULL status rows
UPDATE candidates 
SET status = 'Registered' 
WHERE status IS NULL;

COMMIT;
