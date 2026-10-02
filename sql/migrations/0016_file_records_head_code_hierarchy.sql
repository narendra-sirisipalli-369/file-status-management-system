-- File Entry now lets a user pick Major, Minor, and Code Head all at once
-- (not "pick exactly one level" as before). Replace the polymorphic
-- (head_code_category, head_code_id) pair with three direct FKs — one per
-- level of the Major -> Minor -> Code hierarchy. Major is required for new
-- entries (enforced in application code, not a DB NOT NULL, since legacy
-- rows may end up without a resolvable major after backfill); Minor and
-- Code stay optional finer classification.

ALTER TABLE file_records ADD COLUMN major_head_id uuid REFERENCES major_head_codes (id) ON DELETE RESTRICT;
ALTER TABLE file_records ADD COLUMN minor_head_id uuid REFERENCES head_codes (id) ON DELETE RESTRICT;
ALTER TABLE file_records ADD COLUMN code_head_id  uuid REFERENCES head_code_items (id) ON DELETE RESTRICT;

CREATE INDEX idx_file_records_major_head_id ON file_records (major_head_id);
CREATE INDEX idx_file_records_minor_head_id ON file_records (minor_head_id);
CREATE INDEX idx_file_records_code_head_id  ON file_records (code_head_id);

-- Backfill from the old single (head_code_category, head_code_id) pair,
-- deriving ancestor levels from the hierarchy where possible.
UPDATE file_records fr SET major_head_id = fr.head_code_id
  WHERE fr.head_code_category = 'MAJOR';

UPDATE file_records fr SET minor_head_id = fr.head_code_id, major_head_id = hc.major_id
  FROM head_codes hc
  WHERE fr.head_code_category = 'MINOR' AND hc.id = fr.head_code_id;

UPDATE file_records fr SET code_head_id = fr.head_code_id, minor_head_id = hci.head_code_id
  FROM head_code_items hci
  WHERE fr.head_code_category = 'CODE' AND hci.id = fr.head_code_id;

UPDATE file_records fr SET major_head_id = hc.major_id
  FROM head_codes hc
  WHERE fr.code_head_id IS NOT NULL AND fr.minor_head_id = hc.id AND fr.major_head_id IS NULL;

ALTER TABLE file_records DROP COLUMN head_code_id;
ALTER TABLE file_records DROP COLUMN head_code_category;
