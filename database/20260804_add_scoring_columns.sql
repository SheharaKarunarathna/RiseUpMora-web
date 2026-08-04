-- database/20260804_add_scoring_columns.sql
-- Migration to add candidate evaluation scores and notes strictly to the feedback table.

BEGIN;

-- 1. Ensure feedback table exists
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    panelist_id UUID REFERENCES panelists(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score INT CHECK(score >= 0 AND score <= 100),
    written_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, company_id)
);

-- 2. Add 1-10 category score columns and panelist notes to feedback table
ALTER TABLE feedback
    ADD COLUMN IF NOT EXISTS technical_knowledge INT CHECK (technical_knowledge >= 1 AND technical_knowledge <= 10),
    ADD COLUMN IF NOT EXISTS quality_of_projects INT CHECK (quality_of_projects >= 1 AND quality_of_projects <= 10),
    ADD COLUMN IF NOT EXISTS industry_ready INT CHECK (industry_ready >= 1 AND industry_ready <= 10),
    ADD COLUMN IF NOT EXISTS panelist_notes TEXT;

COMMIT;
