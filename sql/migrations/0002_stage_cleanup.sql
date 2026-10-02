-- ============================================================================
-- Stage master-data cleanup: a stage is now identified by name only.
-- Drops code / department_id / sequence_hint (no longer part of the domain
-- model — stages are no longer department-owned or manually sequenced).
-- Adds stage_type (IN/OUT), a purely informational label set by the admin
-- when adding a stage — it is not read anywhere else in the application.
-- ============================================================================

DROP INDEX IF EXISTS idx_stages_department_id;

ALTER TABLE stages
  DROP COLUMN department_id,
  DROP COLUMN code,
  DROP COLUMN sequence_hint;

CREATE TYPE stage_direction AS ENUM ('IN', 'OUT');

ALTER TABLE stages
  ADD COLUMN stage_type stage_direction NOT NULL DEFAULT 'IN';

COMMENT ON TABLE stages IS 'Permanent master checkpoints, identified by name only. stage_type (IN/OUT) is informational only — it drives no workflow logic.';
