-- database/schema.sql
-- This schema represents the raw PostgreSQL structure for the RiseUpMora web backend.

-- 1. USERS & AUTHENTICATION TABLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'candidate', -- 'candidate', 'admin', 'company_coordinator', 'department_coordinator', 'panelist'
    image TEXT,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NextAuth.js standard tables for sessions and OAuth accounts (if needed)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    UNIQUE(provider, provider_account_id)
);

-- 2. DOMAIN TABLES

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(100) UNIQUE,
    faculty VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    cv_url TEXT,
    profile_image_url TEXT,
    -- Company Preferences (storing company names or IDs)
    pref_1 VARCHAR(255),
    pref_2 VARCHAR(255),
    pref_3 VARCHAR(255),
    pref_4 VARCHAR(255),
    preferred_time_slot VARCHAR(100) DEFAULT '08:00 AM - 11:00 AM',
    application_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROLE-SPECIFIC PROFILES

CREATE TABLE company_coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE department_coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(255) NOT NULL
);

CREATE TABLE panelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    panel_number INT NOT NULL,
    UNIQUE(company_id, panel_number)
);

-- 4. INTERVIEW ALLOCATIONS

CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    panelist_id UUID REFERENCES panelists(id) ON DELETE SET NULL,
    panel_number INT,
    interview_date DATE,
    time_slot VARCHAR(100),
    status VARCHAR(50) DEFAULT '0', -- e.g., '0' (Pending), '1' (Allocated/Approved), etc.
    attendance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, company_id) -- A candidate can only be allocated to a specific company once
);

-- 5. FEEDBACK

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    panelist_id UUID NOT NULL REFERENCES panelists(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score INT CHECK(score >= 0 AND score <= 100),
    written_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, company_id) -- One feedback per candidate per company
);
