import type { PoolClient } from 'pg'
import { pool, query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export type FileStatus = 'DRAFT' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'

export interface FileRecord {
  id: string
  fileId: string
  secureTrackingId: string
  smsRefNo: string
  description: string
  proposalValue: string // numeric comes back as string from pg — callers Number() it for math
  dateSubmission: string
  status: FileStatus
  procurementModeId: string
  authorityId: string
  /** Major -> Minor -> Code hierarchy, all selectable together. Major is required at the application layer; Minor and Code are optional finer classification. */
  majorHeadId: string
  minorHeadId: string | null
  codeHeadId: string | null
  stageManagerId: string
  departmentId: string
  createdById: string | null
  currentStageId: string | null
  createdAt: string
  updatedAt: string
}

export interface FileRecordWithNames extends FileRecord {
  procurementModeName: string
  authorityName: string
  /** Combined "Major / Minor / Code" display strings — skips levels that weren't selected. Kept as a single pair of fields since every existing "Head Code" column/export expects one. */
  headCodeCode: string
  headCodeName: string
  majorHeadCode: string
  majorHeadName: string
  minorHeadCode: string | null
  minorHeadName: string | null
  codeHeadCode: string | null
  codeHeadName: string | null
  departmentName: string
  createdByUsername: string | null
  currentStageName: string | null
}

const JOINED_SELECT = `
  fr.*,
  pm.name AS procurement_mode_name,
  a.name AS authority_name,
  NULLIF(concat_ws(' / ', mhc.code, hc.code, hci.code), '') AS head_code_code,
  NULLIF(concat_ws(' / ', mhc.name, hc.name, hci.name), '') AS head_code_name,
  mhc.code AS major_head_code,
  mhc.name AS major_head_name,
  hc.code AS minor_head_code,
  hc.name AS minor_head_name,
  hci.code AS code_head_code,
  hci.name AS code_head_name,
  d.name AS department_name,
  u.username AS created_by_username,
  cs.name AS current_stage_name
  FROM file_records fr
  JOIN procurement_modes pm ON pm.id = fr.procurement_mode_id
  JOIN authorities a ON a.id = fr.authority_id
  LEFT JOIN major_head_codes mhc ON mhc.id = fr.major_head_id
  LEFT JOIN head_codes hc ON hc.id = fr.minor_head_id
  LEFT JOIN head_code_items hci ON hci.id = fr.code_head_id
  JOIN departments d ON d.id = fr.department_id
  LEFT JOIN users u ON u.id = fr.created_by_id
  LEFT JOIN stages cs ON cs.id = fr.current_stage_id
`

export async function countFileRecords(): Promise<number> {
  const row = await queryOne<{ count: string }>('SELECT count(*)::int AS count FROM file_records')
  return Number(row?.count ?? 0)
}

export async function insertFileRecord(
  client: PoolClient,
  input: {
    secureTrackingId: string
    smsRefNo: string
    description: string
    proposalValue: number
    procurementModeId: string
    authorityId: string
    majorHeadId: string
    minorHeadId: string | null
    codeHeadId: string | null
    stageManagerId: string
    departmentId: string
    createdById: string | null
    currentStageId: string | null
  }
): Promise<FileRecord> {
  const { rows } = await client.query(
    `INSERT INTO file_records (
       secure_tracking_id, sms_ref_no, description, proposal_value,
       procurement_mode_id, authority_id, major_head_id, minor_head_id, code_head_id, stage_manager_id,
       department_id, created_by_id, current_stage_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      input.secureTrackingId,
      input.smsRefNo,
      input.description,
      input.proposalValue,
      input.procurementModeId,
      input.authorityId,
      input.majorHeadId,
      input.minorHeadId,
      input.codeHeadId,
      input.stageManagerId,
      input.departmentId,
      input.createdById,
      input.currentStageId,
    ]
  )
  return toCamel<FileRecord>(rows[0])
}

export async function getFileRecordByAnyId(identifier: string): Promise<FileRecordWithNames | null> {
  const row = await queryOne(
    `SELECT ${JOINED_SELECT}
     WHERE fr.id::text = $1 OR fr.file_id::text = $1 OR fr.secure_tracking_id = $1 OR fr.sms_ref_no = $1
     LIMIT 1`,
    [identifier]
  )
  return row ? toCamel<FileRecordWithNames>(row) : null
}

/** Major is required, Minor and Code are optional — confirms whichever of the three were actually selected still exist before saving a file record. */
export async function headCodeSelectionExists(selection: {
  majorHeadId: string
  minorHeadId: string | null
  codeHeadId: string | null
}): Promise<boolean> {
  const major = await queryOne('SELECT id FROM major_head_codes WHERE id = $1', [selection.majorHeadId])
  if (!major) return false
  if (selection.minorHeadId) {
    const minor = await queryOne('SELECT id FROM head_codes WHERE id = $1', [selection.minorHeadId])
    if (!minor) return false
  }
  if (selection.codeHeadId) {
    const code = await queryOne('SELECT id FROM head_code_items WHERE id = $1', [selection.codeHeadId])
    if (!code) return false
  }
  return true
}

export async function getFileRecordBySecureTrackingId(secureTrackingId: string): Promise<FileRecordWithNames | null> {
  const row = await queryOne(`SELECT ${JOINED_SELECT} WHERE fr.secure_tracking_id = $1`, [secureTrackingId])
  return row ? toCamel<FileRecordWithNames>(row) : null
}

export interface FileRecordFilters {
  q?: string
  from?: string
  to?: string
  departmentId?: string
  smsRefNo?: string
}

function buildWhere(filters: FileRecordFilters, startIndex = 1): { clause: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  let i = startIndex

  if (filters.q) {
    clauses.push(`(fr.description ILIKE $${i} OR fr.sms_ref_no ILIKE $${i} OR fr.secure_tracking_id ILIKE $${i})`)
    params.push(`%${filters.q}%`)
    i++
  }
  if (filters.smsRefNo) {
    clauses.push(`fr.sms_ref_no ILIKE $${i}`)
    params.push(`%${filters.smsRefNo}%`)
    i++
  }
  if (filters.from) {
    clauses.push(`fr.date_submission >= $${i}`)
    params.push(filters.from)
    i++
  }
  if (filters.to) {
    clauses.push(`fr.date_submission <= $${i}`)
    params.push(filters.to)
    i++
  }
  if (filters.departmentId) {
    clauses.push(`fr.department_id = $${i}`)
    params.push(filters.departmentId)
    i++
  }

  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

export async function listFileRecords(filters: FileRecordFilters = {}): Promise<FileRecordWithNames[]> {
  const { clause, params } = buildWhere(filters)
  const rows = await query(
    `SELECT ${JOINED_SELECT} ${clause} ORDER BY fr.created_at DESC`,
    params
  )
  return toCamelRows<FileRecordWithNames>(rows)
}

export interface SimilarFileMatch {
  smsRefNo: string
  description: string
  similarity: number
}

/**
 * Trigram-based (pg_trgm) fuzzy match against existing descriptions,
 * case-insensitive. A similarity of 1 means an exact match (ignoring case) —
 * "FOX SQUAD" vs "fox squad 2" scores ~0.83, well above the 0.7 threshold,
 * which is what catches the "same name plus a trailing number" case without
 * any special-cased regex.
 */
export async function findSimilarFileDescriptions(description: string, threshold = 0.7): Promise<SimilarFileMatch[]> {
  const rows = await query(
    `SELECT sms_ref_no, description, similarity(lower(description), lower($1)) AS similarity
     FROM file_records
     WHERE similarity(lower(description), lower($1)) >= $2
     ORDER BY similarity DESC
     LIMIT 10`,
    [description, threshold]
  )
  return toCamelRows<SimilarFileMatch>(rows)
}

export async function advanceCurrentStage(fileRecordId: string, nextStageId: string | null, client?: PoolClient): Promise<void> {
  const runner = client ?? pool
  if (nextStageId) {
    await runner.query('UPDATE file_records SET current_stage_id = $2 WHERE id = $1', [fileRecordId, nextStageId])
  } else {
    await runner.query(
      `UPDATE file_records SET current_stage_id = NULL, status = 'COMPLETED' WHERE id = $1`,
      [fileRecordId]
    )
  }
}
