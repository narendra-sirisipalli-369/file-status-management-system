import { query, toCamelRows } from '@/lib/db'

export type ScanResult = 'OPENED' | 'ADVANCED' | 'SKIPPED' | 'NOT_FOUND' | 'ERROR'

export interface BarcodeScanLogEntryWithNames {
  id: string
  rawIdentifier: string
  fileRecordId: string | null
  result: ScanResult
  message: string
  actorUserId: string | null
  createdAt: string
  smsRefNo: string | null
  description: string | null
  actorUsername: string | null
}

export async function insertScanLog(input: {
  rawIdentifier: string
  fileRecordId?: string | null
  result: ScanResult
  message: string
  actorUserId?: string | null
}): Promise<void> {
  await query(
    `INSERT INTO barcode_scan_log (raw_identifier, file_record_id, result, message, actor_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.rawIdentifier, input.fileRecordId ?? null, input.result, input.message, input.actorUserId ?? null]
  )
}

export async function listScanLogs(limit = 300): Promise<BarcodeScanLogEntryWithNames[]> {
  const rows = await query(
    `SELECT b.*, fr.sms_ref_no, fr.description, u.username AS actor_username
     FROM barcode_scan_log b
     LEFT JOIN file_records fr ON fr.id = b.file_record_id
     LEFT JOIN users u ON u.id = b.actor_user_id
     ORDER BY b.created_at DESC
     LIMIT $1`,
    [limit]
  )
  return toCamelRows<BarcodeScanLogEntryWithNames>(rows)
}
