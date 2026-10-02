-- ============================================================================
-- status_history now records *who a remark is attributed to* (a Remarks By
-- entry, e.g. CEO) separately from *who performed the action* (actor_user_id,
-- the logged-in admin). ON DELETE SET NULL: deleting a Remarks By entry must
-- not be blocked by old audit rows, and the "By" column display then falls
-- back to the actor's username.
-- ============================================================================

ALTER TABLE status_history
  ADD COLUMN remarks_by_id uuid REFERENCES remarks_by (id) ON DELETE SET NULL;
