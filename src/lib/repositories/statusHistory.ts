import type { PoolClient } from 'pg'
import { pool, query, toCamelRows } from '@/lib/db'

export type StatusHistoryAction =
  | 'CREATED'
  | 'STAGE_ENTERED'
  | 'STAGE_EXITED'
  | 'STAGE_SKIPPED'
  | 'ADVANCED'
  | 'REMARKS_UPDATED'
  | 'FILE_COMPLETED'
  | 'USER_LOGIN'

export interface StatusHistoryEntry {
  id: string
  fileRecordId: string | null
  stageId: string | null
  action: StatusHistoryAction
  remarks: string | null
  remarksById: string | null
  actorUserId: string | null
  timestamp: string
}

export interface StatusHistoryEntryWithNames extends StatusHistoryEntry {
  stageName: string | null
  actorUsername: string | null
  /** Who the remark is attributed to (e.g. "CEO") — falls back to actorUsername in the UI when null. */
  remarksByName: string | null
}

export async function recordHistory(
  input: {
    fileRecordId?: string | null
    stageId?: string | null
    action: StatusHistoryAction
    remarks?: string | null
    remarksById?: string | null
    actorUserId?: string | null
  },
  client?: PoolClient
): Promise<void> {
  const runner = client ?? pool
  await runner.query(
    `INSERT INTO status_history (file_record_id, stage_id, action, remarks, remarks_by_id, actor_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.fileRecordId ?? null,
      input.stageId ?? null,
      input.action,
      input.remarks ?? null,
      input.remarksById ?? null,
      input.actorUserId ?? null,
    ]
  )
}

export async function listHistoryForFile(fileRecordId: string): Promise<StatusHistoryEntryWithNames[]> {
  const rows = await query(
    `SELECT h.*, s.name AS stage_name, u.username AS actor_username, rb.name AS remarks_by_name
     FROM status_history h
     LEFT JOIN stages s ON s.id = h.stage_id
     LEFT JOIN users u ON u.id = h.actor_user_id
     LEFT JOIN remarks_by rb ON rb.id = h.remarks_by_id
     WHERE h.file_record_id = $1
     ORDER BY h."timestamp" ASC`,
    [fileRecordId]
  )
  return toCamelRows<StatusHistoryEntryWithNames>(rows)
}

