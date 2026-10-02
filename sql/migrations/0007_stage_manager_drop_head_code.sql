-- Stage Manager configurations are now keyed on Procurement Mode + Authority
-- only. Head Code stays as its own master-data list (still recorded on
-- file_records) but no longer participates in Stage Manager matching.

ALTER TABLE stage_managers DROP CONSTRAINT stage_managers_combo_unique;
ALTER TABLE stage_managers DROP COLUMN head_code_id;
ALTER TABLE stage_managers ADD CONSTRAINT stage_managers_combo_unique UNIQUE (procurement_mode_id, authority_id);
