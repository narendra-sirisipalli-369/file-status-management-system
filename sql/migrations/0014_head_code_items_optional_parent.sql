-- Master Data's Head Code form was simplified to just Category + Code (no
-- parent picker), so a CODE-level row can now be created without a Minor
-- assigned yet — matches head_codes.major_id, which was already nullable.
ALTER TABLE head_code_items ALTER COLUMN head_code_id DROP NOT NULL;
