-- File Entry's Head Code selection is now "pick a category (Major/Minor/Code),
-- then pick one item from it" — a file's head_code_id can point into any of
-- the three tables, not just head_codes (Minor). Drop the single-table FK
-- (can no longer be enforced by the database across three possible target
-- tables — validated in application code instead) and record which table it
-- points into.
ALTER TABLE file_records DROP CONSTRAINT file_records_head_code_id_fkey;
ALTER TABLE file_records ADD COLUMN head_code_category text NOT NULL DEFAULT 'MINOR' CHECK (head_code_category IN ('MAJOR', 'MINOR', 'CODE'));

-- Superseded by head_code_id + head_code_category together covering all
-- three levels in one pair of columns.
ALTER TABLE file_records DROP COLUMN head_code_item_id;
