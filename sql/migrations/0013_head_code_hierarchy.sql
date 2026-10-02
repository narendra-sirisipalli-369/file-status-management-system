-- Introduces the MAJOR and CODE levels around the existing head_codes table,
-- which becomes the MINOR level of a MAJOR -> MINOR -> CODE hierarchy.
-- Additive only: existing head_codes rows and file_records.head_code_id keep
-- their current meaning (a file record's head code is its MINOR selection);
-- major_id starts NULL on existing rows until assigned via Master Data.

CREATE TABLE major_head_codes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE head_codes ADD COLUMN major_id uuid REFERENCES major_head_codes (id) ON DELETE RESTRICT;

CREATE INDEX idx_head_codes_major_id ON head_codes (major_id);

-- CODE level, child of a head_codes (MINOR) row.
CREATE TABLE head_code_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_code_id   uuid NOT NULL REFERENCES head_codes (id) ON DELETE RESTRICT,
  code           text NOT NULL,
  name           text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_by_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (head_code_id, code)
);

CREATE INDEX idx_head_code_items_head_code_id ON head_code_items (head_code_id);

-- Optional deepest (CODE-level) classification on a file record. Nullable and
-- additive — file_records.head_code_id is unaffected and remains required.
ALTER TABLE file_records ADD COLUMN head_code_item_id uuid REFERENCES head_code_items (id) ON DELETE SET NULL;
