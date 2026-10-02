-- Audit trail for every QR/barcode scan the app receives (GlobalScanListener),
-- success or failure — separate from status_history, which only records
-- actual stage transitions. This answers "what did scanning that file just
-- do" independently of whether it resulted in a stage change.
CREATE TABLE barcode_scan_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_identifier  text NOT NULL,
  file_record_id  uuid REFERENCES file_records (id) ON DELETE SET NULL,
  result          text NOT NULL CHECK (result IN ('OPENED', 'SKIPPED', 'NOT_FOUND', 'ERROR')),
  message         text NOT NULL,
  actor_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_barcode_scan_log_file_record_id ON barcode_scan_log (file_record_id);
CREATE INDEX idx_barcode_scan_log_created_at ON barcode_scan_log (created_at DESC);
