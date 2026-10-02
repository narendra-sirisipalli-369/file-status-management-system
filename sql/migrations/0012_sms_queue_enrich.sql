-- Enrich sms_queue with the context needed to know who/what/where each
-- queued text is about, not just the recipient and message body.
ALTER TABLE sms_queue
  ADD COLUMN remarks        text,
  ADD COLUMN actor_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN department_id  uuid REFERENCES departments (id) ON DELETE SET NULL;

CREATE INDEX idx_sms_queue_department_id ON sms_queue (department_id);

COMMENT ON COLUMN sms_queue.recipient IS 'The department''s kiosk mobile number this text goes to.';
COMMENT ON COLUMN sms_queue.actor_user_id IS 'Who entered the file / advanced the stage that triggered this text.';
COMMENT ON COLUMN sms_queue.remarks IS 'Remarks captured on the stage transition that triggered this text, if any.';
