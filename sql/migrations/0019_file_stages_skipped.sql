-- Distinguishes a stage that was skipped (SKIP action — no remarks, no
-- kiosk message) from one that was normally exited, so the Stage Progress
-- table's Action column can say "Skipped" instead of "Complete".
ALTER TABLE file_stages ADD COLUMN skipped boolean NOT NULL DEFAULT false;
