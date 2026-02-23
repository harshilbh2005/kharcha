-- Migration 001: Add target_month to income_entries
-- target_month (TEXT, nullable, "YYYY-MM" format) indicates which month
-- the allowance covers. Used to calculate daily limit horizon.

ALTER TABLE income_entries ADD COLUMN target_month TEXT;

CREATE INDEX idx_income_target_month ON income_entries(profile_id, target_month);
