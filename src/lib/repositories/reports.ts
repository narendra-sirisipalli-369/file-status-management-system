import { query, toCamelRows } from '@/lib/db'

export interface ReportFilters {
  departmentId?: string
  procurementModeId?: string
  authorityId?: string
  headCodeId?: string
  stageId?: string
  from?: string
  to?: string
  q?: string
}

export interface ReportRow {
  fileRecordId: string
  smsRefNo: string
  description: string
  proposalValue: string
  departmentName: string
  headCodeCode: string
  headCodeName: string
  procurementModeName: string
  authorityName: string
  fileEnteredAt: string
  stageName: string
  sequenceOrder: number
  enteredAt: string | null
  exitedAt: string | null
  action: 'Complete' | 'Skipped' | 'In progress' | 'Pending'
}

export function parseReportFilters(searchParams: URLSearchParams): ReportFilters {
  return {
    departmentId: searchParams.get('departmentId') ?? undefined,
    procurementModeId: searchParams.get('procurementModeId') ?? undefined,
    authorityId: searchParams.get('authorityId') ?? undefined,
    headCodeId: searchParams.get('headCodeId') ?? undefined,
    stageId: searchParams.get('stageId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    q: searchParams.get('q') ?? undefined,
  }
}

function buildWhere(filters: ReportFilters): { clause: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filters.q) {
    clauses.push(`(fr.description ILIKE $${i} OR fr.sms_ref_no ILIKE $${i} OR fr.secure_tracking_id ILIKE $${i})`)
    params.push(`%${filters.q}%`)
    i++
  }
  if (filters.departmentId) {
    clauses.push(`fr.department_id = $${i}`)
    params.push(filters.departmentId)
    i++
  }
  if (filters.procurementModeId) {
    clauses.push(`fr.procurement_mode_id = $${i}`)
    params.push(filters.procurementModeId)
    i++
  }
  if (filters.authorityId) {
    clauses.push(`fr.authority_id = $${i}`)
    params.push(filters.authorityId)
    i++
  }
  if (filters.headCodeId) {
    clauses.push(`(fr.major_head_id = $${i} OR fr.minor_head_id = $${i} OR fr.code_head_id = $${i})`)
    params.push(filters.headCodeId)
    i++
  }
  if (filters.stageId) {
    clauses.push(`fs.stage_id = $${i}`)
    params.push(filters.stageId)
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

  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
}

/** One row per (file, stage) — the flattened dataset behind the Reports page and its exports. */
export async function listReportRows(filters: ReportFilters = {}): Promise<ReportRow[]> {
  const { clause, params } = buildWhere(filters)
  const rows = await query(
    `SELECT
       fr.id AS file_record_id,
       fr.sms_ref_no,
       fr.description,
       fr.proposal_value,
       d.name AS department_name,
       NULLIF(concat_ws(' / ', mhc.code, hc.code, hci.code), '') AS head_code_code,
       NULLIF(concat_ws(' / ', mhc.name, hc.name, hci.name), '') AS head_code_name,
       pm.name AS procurement_mode_name,
       a.name AS authority_name,
       fr.date_submission AS file_entered_at,
       s.name AS stage_name,
       fs.sequence_order,
       fs.entered_at,
       fs.exited_at,
       CASE
         WHEN fs.exited_at IS NOT NULL AND fs.skipped THEN 'Skipped'
         WHEN fs.exited_at IS NOT NULL THEN 'Complete'
         WHEN fs.entered_at IS NOT NULL THEN 'In progress'
         ELSE 'Pending'
       END AS action
     FROM file_records fr
     JOIN file_stages fs ON fs.file_record_id = fr.id
     JOIN stages s ON s.id = fs.stage_id
     JOIN departments d ON d.id = fr.department_id
     LEFT JOIN major_head_codes mhc ON mhc.id = fr.major_head_id
     LEFT JOIN head_codes hc ON hc.id = fr.minor_head_id
     LEFT JOIN head_code_items hci ON hci.id = fr.code_head_id
     JOIN procurement_modes pm ON pm.id = fr.procurement_mode_id
     JOIN authorities a ON a.id = fr.authority_id
     ${clause}
     ORDER BY fr.created_at DESC, fs.sequence_order ASC`,
    params
  )
  return toCamelRows<ReportRow>(rows)
}
