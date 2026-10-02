-- The confirm popup's "scan again" / "Next" path exits the stage and
-- advances the file — distinct from the initial "OPENED" scan that just
-- navigated to it. Add ADVANCED so the scan log can tell the two apart
-- instead of mislabeling the advance as another OPENED.
ALTER TABLE barcode_scan_log DROP CONSTRAINT barcode_scan_log_result_check;
ALTER TABLE barcode_scan_log ADD CONSTRAINT barcode_scan_log_result_check
  CHECK (result IN ('OPENED', 'ADVANCED', 'SKIPPED', 'NOT_FOUND', 'ERROR'));
