-- ============================================================================
-- IND-CV Registry — initial production schema
-- Plain PostgreSQL, no ORM. Columns use snake_case throughout so identifiers
-- never need quoting in hand-written SQL (Postgres folds unquoted identifiers
-- to lowercase, which is what snake_case already is).
--
-- Roles: exactly two — ADMIN (does everything: file entry, stage in/out,
-- master data, Stage Manager config, user management) and KIOSK (per
-- department, view-only search/track). There is no third "staff" role.
--
-- Stages are permanent master data. A stage is only a stage — it has no
-- notion of IN/OUT. Entering/exiting a stage is an audit-only action stored
-- on file_stages; it never drives which stage a file is "at" — that is
-- file_records.current_stage_id, updated explicitly when a stage is
-- completed.
-- ============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm; -- powers ILIKE-style search indexes below

-- ─── ENUMS ──────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('ADMIN', 'KIOSK');

CREATE TYPE file_status AS ENUM (
  'DRAFT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'REJECTED'
);

-- ─── updated_at trigger helper (Postgres has no @updatedAt magic) ────────

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── DEPARTMENT ─────────────────────────────────────────────────────────

CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  code        text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE departments IS 'The 32 offices. Owns stages and kiosk logins; files also record which department originated them.';

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_departments_is_active ON departments (is_active);

-- ─── USER ───────────────────────────────────────────────────────────────

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       text NOT NULL UNIQUE,
  password       text NOT NULL,
  role           user_role NOT NULL,
  department_id  uuid REFERENCES departments (id) ON DELETE RESTRICT,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_department_matches_role CHECK (
    (role = 'ADMIN' AND department_id IS NULL) OR
    (role = 'KIOSK' AND department_id IS NOT NULL)
  )
);
COMMENT ON TABLE users IS 'Exactly one ADMIN (enforced by one_admin_only below) and at most one KIOSK per department (one_kiosk_per_department).';

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_department_id ON users (department_id);
CREATE INDEX idx_users_is_active ON users (is_active);

-- Partial unique indexes: constraints Prisma's schema DSL cannot express.
CREATE UNIQUE INDEX one_admin_only ON users (role) WHERE role = 'ADMIN';
CREATE UNIQUE INDEX one_kiosk_per_department ON users (department_id) WHERE role = 'KIOSK';

-- ─── EXTENSIBLE LOOKUPS (predefined + growable "Other") ───────────────────

CREATE TABLE procurement_modes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL UNIQUE,
  is_system_defined  boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_by_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE procurement_modes IS 'Predefined + "Other"-grown list of procurement modes (Open Tender, Limited Tender, ...).';
CREATE INDEX idx_procurement_modes_is_active ON procurement_modes (is_active);

CREATE TABLE authorities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL UNIQUE,
  is_system_defined  boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_by_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE authorities IS 'Predefined + "Other"-grown list of approving authorities.';
CREATE INDEX idx_authorities_is_active ON authorities (is_active);

CREATE TABLE head_codes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  name               text NOT NULL,
  is_system_defined  boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_by_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE head_codes IS 'Major/Minor Head Code budget classification, predefined + "Other"-grown.';
CREATE INDEX idx_head_codes_is_active ON head_codes (is_active);

-- ─── STAGE MASTER (30+ permanent checkpoints; a stage is only a stage) ────

CREATE TABLE stages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  code            text NOT NULL UNIQUE,
  department_id   uuid NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  sequence_hint   integer NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE stages IS 'Permanent master checkpoints. No IN/OUT concept here — see file_stages.';
COMMENT ON COLUMN stages.department_id IS 'Which office owns/handles this checkpoint, for labeling and reporting (not a permission gate — only ADMIN acts on stages).';

CREATE TRIGGER stages_set_updated_at
  BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_stages_is_active ON stages (is_active);
CREATE INDEX idx_stages_department_id ON stages (department_id);

-- ─── STAGE MANAGER: admin-configured stage set per (mode, authority, head code) ───

CREATE TABLE stage_managers (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  procurement_mode_id  uuid NOT NULL REFERENCES procurement_modes (id) ON DELETE RESTRICT,
  authority_id         uuid NOT NULL REFERENCES authorities (id) ON DELETE RESTRICT,
  head_code_id         uuid NOT NULL REFERENCES head_codes (id) ON DELETE RESTRICT,
  is_active            boolean NOT NULL DEFAULT true,
  created_by_id        uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_managers_combo_unique UNIQUE (procurement_mode_id, authority_id, head_code_id)
);
COMMENT ON TABLE stage_managers IS 'Admin-configured: which stages apply for a given Mode + Authority + Head Code combination.';

CREATE TRIGGER stage_managers_set_updated_at
  BEFORE UPDATE ON stage_managers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_stage_managers_is_active ON stage_managers (is_active);

CREATE TABLE stage_manager_stages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_manager_id   uuid NOT NULL REFERENCES stage_managers (id) ON DELETE CASCADE,
  stage_id           uuid NOT NULL REFERENCES stages (id) ON DELETE RESTRICT,
  sequence_order     integer NOT NULL CHECK (sequence_order > 0),
  CONSTRAINT stage_manager_stages_stage_unique UNIQUE (stage_manager_id, stage_id),
  CONSTRAINT stage_manager_stages_order_unique UNIQUE (stage_manager_id, sequence_order)
);
COMMENT ON TABLE stage_manager_stages IS 'The ordered stage list an admin picked for one Stage Manager configuration.';

CREATE INDEX idx_stage_manager_stages_stage_manager_id ON stage_manager_stages (stage_manager_id);
CREATE INDEX idx_stage_manager_stages_stage_id ON stage_manager_stages (stage_id);

-- ─── FILE RECORD (core entity) ─────────────────────────────────────────────

CREATE TABLE file_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id               uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  secure_tracking_id    text NOT NULL UNIQUE,
  sms_ref_no            text NOT NULL UNIQUE,
  description           text NOT NULL,
  proposal_value        numeric(14,2) NOT NULL CHECK (proposal_value >= 0),
  date_submission       timestamptz NOT NULL DEFAULT now(),
  status                file_status NOT NULL DEFAULT 'IN_PROGRESS',

  procurement_mode_id   uuid NOT NULL REFERENCES procurement_modes (id) ON DELETE RESTRICT,
  authority_id          uuid NOT NULL REFERENCES authorities (id) ON DELETE RESTRICT,
  head_code_id          uuid NOT NULL REFERENCES head_codes (id) ON DELETE RESTRICT,
  stage_manager_id      uuid NOT NULL REFERENCES stage_managers (id) ON DELETE RESTRICT,

  department_id         uuid NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  created_by_id         uuid REFERENCES users (id) ON DELETE SET NULL,
  current_stage_id      uuid REFERENCES stages (id) ON DELETE SET NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE file_records IS 'Core procurement file. Its stage list is auto-generated from stage_manager_stages at creation time — never picked manually.';
COMMENT ON COLUMN file_records.current_stage_id IS 'Single source of truth for "where is this file" — independent of file_stages entered/exited timestamps.';

CREATE TRIGGER file_records_set_updated_at
  BEFORE UPDATE ON file_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_file_records_secure_tracking_id ON file_records (secure_tracking_id);
CREATE INDEX idx_file_records_sms_ref_no ON file_records (sms_ref_no);
CREATE INDEX idx_file_records_file_id ON file_records (file_id);
CREATE INDEX idx_file_records_created_by_id ON file_records (created_by_id);
CREATE INDEX idx_file_records_status ON file_records (status);
CREATE INDEX idx_file_records_date_submission ON file_records (date_submission);
CREATE INDEX idx_file_records_department_id ON file_records (department_id);
CREATE INDEX idx_file_records_procurement_mode_id ON file_records (procurement_mode_id);
CREATE INDEX idx_file_records_authority_id ON file_records (authority_id);
CREATE INDEX idx_file_records_head_code_id ON file_records (head_code_id);
CREATE INDEX idx_file_records_stage_manager_id ON file_records (stage_manager_id);
CREATE INDEX idx_file_records_current_stage_id ON file_records (current_stage_id);
-- Case-insensitive search support (kiosk/admin search boxes use ILIKE).
CREATE INDEX idx_file_records_description_trgm ON file_records USING gin (description gin_trgm_ops);

-- ─── PER-FILE STAGE LIST: entered/exited are audit-only, never workflow state ──

CREATE TABLE file_stages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_record_id   uuid NOT NULL REFERENCES file_records (id) ON DELETE CASCADE,
  stage_id         uuid NOT NULL REFERENCES stages (id) ON DELETE RESTRICT,
  sequence_order   integer NOT NULL CHECK (sequence_order > 0),

  entered_at       timestamptz,
  entered_by_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  exited_at        timestamptz,
  exited_by_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  remarks          text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT file_stages_stage_unique UNIQUE (file_record_id, stage_id),
  CONSTRAINT file_stages_order_unique UNIQUE (file_record_id, sequence_order),
  CONSTRAINT file_stages_exit_after_entry CHECK (
    exited_at IS NULL OR entered_at IS NULL OR exited_at >= entered_at
  )
);
COMMENT ON TABLE file_stages IS 'Snapshot of stage_manager_stages copied at file-creation time, so later Stage Manager edits do not retroactively change files already in flight. entered_at/exited_at are audit facts only.';

CREATE TRIGGER file_stages_set_updated_at
  BEFORE UPDATE ON file_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_file_stages_file_record_id ON file_stages (file_record_id);
CREATE INDEX idx_file_stages_stage_id ON file_stages (stage_id);

-- ─── AUDIT LOG (append-only) ────────────────────────────────────────────────

CREATE TABLE status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_record_id  uuid REFERENCES file_records (id) ON DELETE CASCADE,
  stage_id        uuid REFERENCES stages (id) ON DELETE SET NULL,
  action          text NOT NULL, -- CREATED, STAGE_ENTERED, STAGE_EXITED, REMARKS_UPDATED, FILE_COMPLETED, USER_LOGIN, ...
  remarks         text,
  actor_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  "timestamp"     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE status_history IS 'Append-only audit trail. file_record_id is nullable to allow non-file events such as USER_LOGIN.';

CREATE INDEX idx_status_history_file_record_id ON status_history (file_record_id);
CREATE INDEX idx_status_history_actor_user_id ON status_history (actor_user_id);
CREATE INDEX idx_status_history_stage_id ON status_history (stage_id);
CREATE INDEX idx_status_history_timestamp ON status_history ("timestamp");
CREATE INDEX idx_status_history_action ON status_history (action);
