import type { PoolClient } from 'pg'
import { pool, query, toCamelRows } from '@/lib/db'

export type SmsStatus = 'PENDING' | 'SENT'

export interface SmsQueueEntryWithNames {
  id: string
  recipient: string
  message: string
  status: SmsStatus
  createdAt: string
  sentAt: string | null
  fileRecordId: string | null
  smsRefNo: string | null
  departmentId: string | null
  departmentName: string | null
  actorUsername: string | null
}

/** The department's KIOSK account mobile number — the "department number" a stage-change text goes to. */
export async function getDepartmentKioskMobile(departmentId: string, client?: PoolClient): Promise<string | null> {
  const { rows } = await (client ?? pool).query(
    `SELECT mobile_number FROM users WHERE department_id = $1 AND role = 'KIOSK' AND is_active = true LIMIT 1`,
    [departmentId]
  )
  return rows[0]?.mobile_number ?? null
}

/** Who to credit a remark to: the "Remarks By" attribution if set, else the actor's username — same fallback the file detail page's Status Summary uses. */
export async function resolveActorName(
  actorUserId: string | null,
  remarksById: string | null,
  client?: PoolClient
): Promise<string | null> {
  const runner = client ?? pool
  if (remarksById) {
    const { rows } = await runner.query(`SELECT name FROM remarks_by WHERE id = $1`, [remarksById])
    if (rows[0]?.name) return rows[0].name
  }
  if (actorUserId) {
    const { rows } = await runner.query(`SELECT username FROM users WHERE id = $1`, [actorUserId])
    if (rows[0]?.username) return rows[0].username
  }
  return null
}

export async function enqueueSms(
  input: {
    recipient: string
    message: string
    fileRecordId?: string | null
    departmentId?: string | null
    actorUserId?: string | null
    remarks?: string | null
  },
  client?: PoolClient
): Promise<void> {
  await (client ?? pool).query(
    `INSERT INTO sms_queue (recipient, message, file_record_id, department_id, actor_user_id, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.recipient,
      input.message,
      input.fileRecordId ?? null,
      input.departmentId ?? null,
      input.actorUserId ?? null,
      input.remarks ?? null,
    ]
  )
}

/** Backs the Automation Log admin page — every queued text, sent or still pending, newest first. */
export async function listSmsQueue(limit = 300): Promise<SmsQueueEntryWithNames[]> {
  const rows = await query(
    `SELECT sq.*, fr.sms_ref_no, d.name AS department_name, u.username AS actor_username
     FROM sms_queue sq
     LEFT JOIN file_records fr ON fr.id = sq.file_record_id
     LEFT JOIN departments d ON d.id = sq.department_id
     LEFT JOIN users u ON u.id = sq.actor_user_id
     ORDER BY sq.created_at DESC
     LIMIT $1`,
    [limit]
  )
  return toCamelRows<SmsQueueEntryWithNames>(rows)
}

/** Polled by the Android device that actually sends the text via its SIM. */
export async function listPendingSms(): Promise<{ id: string; recipient: string; message: string }[]> {
  const rows = await query(
    `SELECT id, recipient, message FROM sms_queue WHERE status = 'PENDING' ORDER BY created_at ASC`
  )
  return toCamelRows<{ id: string; recipient: string; message: string }>(rows)
}

/** The device reports back which ids it actually sent — this is what flips the log from "pending" to "sent". */
export async function markSmsSent(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const { rowCount } = await pool.query(
    `UPDATE sms_queue SET status = 'SENT', sent_at = now() WHERE id = ANY($1::uuid[]) AND status = 'PENDING'`,
    [ids]
  )
  return rowCount ?? 0
}
