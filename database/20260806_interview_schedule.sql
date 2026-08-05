-- database/20260806_interview_schedule.sql
-- Final allocated interview schedule for the Internship & Mock Interview Fair.
-- Source: entc_cs_it_interview_schedule.csv (ENTC / CSE / IT departments).
--
-- Rows are keyed by student index number rather than candidates.id, so that
-- a schedule row still imports for a student who has not registered on the
-- site yet, and links up automatically if they register later.
--
-- NOTE: the source CSV listed index 230687P twice for "Idea 8" at 10.15
-- (Panel 1 and Panel 2). Only the Panel 1 row is imported here.

BEGIN;

CREATE TABLE IF NOT EXISTS interview_schedule (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    student_id     VARCHAR(100) NOT NULL,
    panel_number   INT NOT NULL,
    interview_time TIME NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_schedule_student
    ON interview_schedule (student_id);

-- Company labels in the CSV do not match companies.name exactly, so they are
-- mapped explicitly here. All six mappings were verified against the database.
INSERT INTO interview_schedule (company_id, student_id, panel_number, interview_time)
SELECT c.id,
       s.student_id,
       s.panel_number::int,
       s.interview_time::time
FROM (VALUES
    ('Creative Software', '234086E', '1', '10:00'),
    ('Creative Software', '230667R', '1', '10:15'),
    ('Creative Software', '230354T', '1', '11:00'),
    ('Creative Software', '230291V', '1', '11:15'),
    ('Creative Software', '234043V', '1', '13:30'),
    ('Creative Software', '230699E', '1', '14:30'),
    ('Creative Software', '235063N', '1', '14:45'),
    ('Creative Software', '230048J', '2', '10:00'),
    ('Creative Software', '230243D', '2', '10:15'),
    ('Creative Software', '230475N', '2', '11:00'),
    ('Creative Software', '234204R', '2', '11:15'),
    ('Creative Software', '234004E', '2', '13:30'),
    ('Creative Software', '235097V', '2', '14:30'),
    ('Creative Software', '234183A', '2', '14:45'),
    ('Creative Software', '230636K', '3', '10:00'),
    ('Creative Software', '230214P', '3', '11:00'),
    ('Creative Software', '230089J', '3', '11:15'),
    ('Creative Software', '234167E', '3', '13:30'),
    ('Creative Software', '230017N', '3', '14:30'),
    ('Creative Software', '235016B', '3', '14:45'),
    ('Creative Software', '230151T', '4', '10:00'),
    ('Creative Software', '230518C', '4', '11:00'),
    ('Creative Software', '230075M', '4', '11:15'),
    ('Creative Software', '235101G', '4', '13:30'),
    ('Creative Software', '235064T', '4', '14:30'),
    ('Creative Software', '235086L', '4', '14:45'),
    ('GTN', '235019L', '1', '10:00'),
    ('GTN', '230703N', '1', '10:15'),
    ('GTN', '234003B', '1', '11:00'),
    ('GTN', '234228T', '1', '11:15'),
    ('GTN', '230324D', '1', '13:30'),
    ('GTN', '234092T', '1', '14:30'),
    ('GTN', '230081D', '2', '10:00'),
    ('GTN', '230642B', '2', '11:00'),
    ('GTN', '230126X', '2', '13:30'),
    ('GTN', '230091H', '2', '14:30'),
    ('GTN', '230595G', '3', '10:00'),
    ('GTN', '234231V', '3', '11:00'),
    ('Zero Beta', '230427V', '1', '10:00'),
    ('Zero Beta', '230452R', '1', '10:15'),
    ('Zero Beta', '230680M', '1', '10:30'),
    ('Zero Beta', '230311K', '1', '10:45'),
    ('Zero Beta', '230361L', '1', '11:00'),
    ('Zero Beta', '230651C', '1', '11:15'),
    ('Zero Beta', '230015G', '1', '13:30'),
    ('Zero Beta', '230520B', '1', '13:45'),
    ('Zero Beta', '230202D', '1', '14:30'),
    ('Zero Beta', '234195L', '2', '10:00'),
    ('Zero Beta', '230199V', '2', '10:15'),
    ('Zero Beta', '235077K', '2', '10:30'),
    ('Zero Beta', '230336P', '2', '10:45'),
    ('Zero Beta', '230451M', '2', '11:00'),
    ('Zero Beta', '230280L', '2', '11:15'),
    ('Zero Beta', '230234C', '2', '13:30'),
    ('Zero Beta', '235116G', '2', '14:30'),
    ('Idea 8', '234080F', '1', '10:00'),
    ('Idea 8', '230687P', '1', '10:15'),
    ('Idea 8', '230395T', '1', '10:30'),
    ('Idea 8', '230469B', '1', '11:00'),
    ('Idea 8', '235071L', '1', '13:30'),
    ('Idea 8', '230470U', '1', '13:45'),
    ('Idea 8', '230076R', '1', '14:30'),
    ('Idea 8', '235123B', '2', '10:00'),
    ('Idea 8', '230508V', '2', '13:30'),
    ('Idea 8', '230258D', '2', '13:45'),
    ('Idea 8', '230186E', '2', '14:30'),
    ('Vario System', '230563H', '1', '10:00'),
    ('Vario System', '230058N', '1', '10:15'),
    ('Vario System', '230248X', '1', '10:30'),
    ('Vario System', '230407K', '1', '11:00'),
    ('Vario System', '230689A', '1', '11:15'),
    ('Vario System', '230070T', '1', '13:30'),
    ('Vario System', '230145E', '1', '13:45'),
    ('Vario System', '230211E', '1', '14:30'),
    ('Vario System', '230155J', '1', '14:45'),
    ('Vario System', '230536E', '2', '10:00'),
    ('Vario System', '230212H', '2', '10:15'),
    ('Vario System', '230502X', '2', '11:00'),
    ('Vario System', '230355X', '2', '11:15'),
    ('Vario System', '230256U', '2', '13:30'),
    ('Vario System', '230175U', '2', '14:30'),
    ('Vario System', '235005P', '3', '10:00'),
    ('Vario System', '230318M', '3', '10:15'),
    ('Vario System', '230018T', '3', '11:00'),
    ('Vario System', '230236J', '3', '11:15'),
    ('Vario System', '234187N', '3', '13:30'),
    ('Vario System', '230082G', '3', '14:30'),
    ('Vario System', '230417P', '4', '10:00'),
    ('Vario System', '230052P', '4', '10:15'),
    ('Vario System', '230477X', '4', '11:00'),
    ('Vario System', '230629R', '4', '13:30'),
    ('Vario System', '230492M', '4', '14:30'),
    ('Hutch', '234217J', '1', '10:00'),
    ('Hutch', '230726L', '1', '10:15'),
    ('Hutch', '230208C', '1', '11:00'),
    ('Hutch', '230303M', '1', '11:15'),
    ('Hutch', '230013A', '1', '13:30'),
    ('Hutch', '234130K', '1', '13:45'),
    ('Hutch', '230033J', '1', '14:00'),
    ('Hutch', '230659H', '1', '14:30'),
    ('Hutch', '234011X', '1', '14:45'),
    ('Hutch', '230195F', '2', '10:00'),
    ('Hutch', '230179K', '2', '11:00'),
    ('Hutch', '230353N', '2', '11:15'),
    ('Hutch', '230495B', '2', '13:30'),
    ('Hutch', '234099V', '2', '13:45'),
    ('Hutch', '230219K', '2', '14:00'),
    ('Hutch', '234103G', '2', '14:30')
) AS s(csv_company, student_id, panel_number, interview_time)
JOIN (VALUES
    ('Creative Software', 'Creative Software'),
    ('GTN',               'GTN tech'),
    ('Zero Beta',         'ZeroBeta'),
    ('Idea 8',            'Idea8'),
    ('Vario System',      'VarioSystems'),
    ('Hutch',             'Hutch | Internet & Telecommunication Service Provider')
) AS m(csv_company, db_company) ON m.csv_company = s.csv_company
JOIN companies c ON c.name = m.db_company
ON CONFLICT (company_id, student_id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (run separately after the migration):
--
--   -- Should return 108
--   SELECT COUNT(*) FROM interview_schedule;
--
--   -- Rows per company
--   SELECT c.name, COUNT(*)
--   FROM interview_schedule s JOIN companies c ON c.id = s.company_id
--   GROUP BY c.name ORDER BY c.name;
--
--   -- Scheduled index numbers with no registered candidate account
--   SELECT s.student_id
--   FROM interview_schedule s
--   LEFT JOIN candidates cd ON cd.student_id = s.student_id
--   WHERE cd.id IS NULL;
-- ---------------------------------------------------------------------------
