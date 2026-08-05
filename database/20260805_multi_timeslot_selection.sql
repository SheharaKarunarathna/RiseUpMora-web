-- database/20260805_multi_timeslot_selection.sql
-- Converts candidate time-slot selection from a single slot per preference
-- (dropdown) to multiple ticked slots (checkboxes), stored as integer arrays.
-- A candidate can now tick any combination of slots 1-4 as their preferred
-- interview times, shared across Preference 1 and Preference 2.

BEGIN;

-- 1. Drop the old single-value CHECK constraints on candidates
ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_pref_1_timeslot_check,
  DROP CONSTRAINT IF EXISTS candidates_pref_2_timeslot_check;

-- 2. Convert pref_1_timeslot / pref_2_timeslot from a single INT to INT[]
--    (NULL stays NULL — no preference/no slots ticked; existing single values
--    are wrapped into a one-element array so no data is lost)
ALTER TABLE candidates
  ALTER COLUMN pref_1_timeslot TYPE INT[] USING (
    CASE WHEN pref_1_timeslot IS NULL THEN NULL ELSE ARRAY[pref_1_timeslot] END
  ),
  ALTER COLUMN pref_2_timeslot TYPE INT[] USING (
    CASE WHEN pref_2_timeslot IS NULL THEN NULL ELSE ARRAY[pref_2_timeslot] END
  );

-- 3. Re-add constraints ensuring every ticked slot is between 1 and 4
ALTER TABLE candidates
  ADD CONSTRAINT candidates_pref_1_timeslot_check CHECK (pref_1_timeslot <@ ARRAY[1, 2, 3, 4]::int[]),
  ADD CONSTRAINT candidates_pref_2_timeslot_check CHECK (pref_2_timeslot <@ ARRAY[1, 2, 3, 4]::int[]);

-- 4. timeslot_bookings previously allowed only one slot_number row per
--    (company, candidate, preference_number). A candidate can now tick
--    several slots for the same preference, so that needs to become
--    one row per ticked slot. Relax the unique constraint to include
--    slot_number (drop whatever the existing generated name is, then
--    add the new one).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'timeslot_bookings'
    AND tc.constraint_type = 'UNIQUE';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE timeslot_bookings DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE timeslot_bookings
  ADD CONSTRAINT timeslot_bookings_unique_slot UNIQUE (company_id, candidate_id, preference_number, slot_number);

COMMIT;
