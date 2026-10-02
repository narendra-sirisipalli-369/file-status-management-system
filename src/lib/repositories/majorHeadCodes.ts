import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export interface MajorHeadCode {
  id: string
  code: string
  name: string
  isActive: boolean
  createdById: string | null
  createdAt: string
}

export async function listMajorHeadCodes(opts: { activeOnly?: boolean } = {}): Promise<MajorHeadCode[]> {
  const rows = opts.activeOnly
    ? await query('SELECT * FROM major_head_codes WHERE is_active = true ORDER BY code ASC')
    : await query('SELECT * FROM major_head_codes ORDER BY code ASC')
  return toCamelRows<MajorHeadCode>(rows)
}

export async function getMajorHeadCodeById(id: string): Promise<MajorHeadCode | null> {
  const row = await queryOne('SELECT * FROM major_head_codes WHERE id = $1', [id])
  return row ? toCamel<MajorHeadCode>(row) : null
}

export async function getMajorHeadCodeByCode(code: string): Promise<MajorHeadCode | null> {
  const row = await queryOne('SELECT * FROM major_head_codes WHERE lower(code) = lower($1)', [code])
  return row ? toCamel<MajorHeadCode>(row) : null
}

export async function findOrCreateMajorHeadCode(
  input: { code: string; name: string },
  createdById: string | null
): Promise<MajorHeadCode> {
  const existing = await getMajorHeadCodeByCode(input.code)
  if (existing) return existing
  const row = await queryOne(
    `INSERT INTO major_head_codes (code, name, created_by_id) VALUES ($1, $2, $3) RETURNING *`,
    [input.code, input.name, createdById]
  )
  return toCamel<MajorHeadCode>(row!)
}

export async function updateMajorHeadCode(
  id: string,
  input: { code?: string; name?: string; isActive?: boolean }
): Promise<MajorHeadCode | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let i = 1
  if (input.code !== undefined) { sets.push(`code = $${i++}`); params.push(input.code) }
  if (input.name !== undefined) { sets.push(`name = $${i++}`); params.push(input.name) }
  if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(input.isActive) }
  if (sets.length === 0) return getMajorHeadCodeById(id)
  params.push(id)
  const row = await queryOne(`UPDATE major_head_codes SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, params)
  return row ? toCamel<MajorHeadCode>(row) : null
}

/** Hard delete. Blocked (pg 23503) if a head code (Minor) still references this Major. */
export async function deleteMajorHeadCode(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM major_head_codes WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
