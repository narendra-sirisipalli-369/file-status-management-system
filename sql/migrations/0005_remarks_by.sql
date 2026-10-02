-- ============================================================================
-- "Remarks By" — an extensible Master Data list (same shape as
-- procurement_modes / authorities) naming who a stage-entry/exit remark is
-- attributed to (CEO, Logistics, ...). Purely a labeling list — there is no
-- "None" row here; None is the UI's default (no selection => no remarks
-- sent at all), not a database entry.
-- ============================================================================

CREATE TABLE remarks_by (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL UNIQUE,
  is_system_defined  boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_by_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE remarks_by IS 'Predefined + admin-grown list of who a stage remark is attributed to (CEO, Logistics, ...). Selected in the File Details Enter/Exit remarks box.';
CREATE INDEX idx_remarks_by_is_active ON remarks_by (is_active);
