-- database/20260804_add_preferred_time_slot.sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(100) DEFAULT '08:00 AM - 11:00 AM';
