-- ============================================================================
-- Adds a mobile number to user accounts (primarily for Kiosk/department
-- accounts) — groundwork for future stage-change message automation.
-- Nullable: not required at signup time, not role-restricted at the DB level.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN mobile_number text;
