-- ============================================================================
-- A Stage Manager configuration's identity is the (mode, authority, head code)
-- triple (already enforced by stage_managers_combo_unique) — the free-text
-- "name" field is no longer collected in the UI, so drop it. The list view
-- now displays a label computed from the joined mode/authority/head-code names.
-- ============================================================================

ALTER TABLE stage_managers
  DROP COLUMN name;
