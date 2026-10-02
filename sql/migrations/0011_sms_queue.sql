-- Outbound SMS queue: a row is enqueued whenever a file is entered or moves
-- to a new stage, addressed to that file's department (the department's
-- KIOSK account mobile_number). A separate Android app polls this and sends
-- the actual text via the device's SIM — see /api/sms-queue.
CREATE TABLE sms_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_record_id  uuid REFERENCES file_records (id) ON DELETE CASCADE,
  recipient       text NOT NULL,
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);

CREATE INDEX idx_sms_queue_status ON sms_queue (status);
CREATE INDEX idx_sms_queue_file_record_id ON sms_queue (file_record_id);
