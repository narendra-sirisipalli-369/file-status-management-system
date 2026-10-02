-- Admin-editable sort key for the stage picker. Backfilled from the current
-- alphabetical order so nothing visibly reorders until someone edits it.
ALTER TABLE stages ADD COLUMN display_order integer;

UPDATE stages s
SET display_order = ranked.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY name ASC) AS rn
  FROM stages
) ranked
WHERE ranked.id = s.id;

ALTER TABLE stages ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX idx_stages_display_order ON stages (display_order);

COMMENT ON COLUMN stages.display_order IS 'Admin-editable sort key for the stage picker; ties break by name. Not enforced unique.';
