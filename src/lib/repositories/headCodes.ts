import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

/** The MINOR level of the Major -> Minor -> Code hierarchy. majorId is nullable — existing rows predate the Major level and start unassigned. */
export interface HeadCode {
  id: string
  code: string
  name: string
  majorId: string | null
  isSystemDefined: boolean
  isActive: boolean
  createdById: string | null
  createdAt: string
}

export async function listHeadCodes(opts: { activeOnly?: boolean; majorId?: string } = {}): Promise<HeadCode[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  if (opts.activeOnly) conditions.push('is_active = true')
  if (opts.majorId) { params.push(opts.majorId); conditions.push(`major_id = $${params.length}`) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = await query(`SELECT * FROM head_codes ${where} ORDER BY code ASC`, params)
  return toCamelRows<HeadCode>(rows)
}

export async function getHeadCodeById(id: string): Promise<HeadCode | null> {
  const row = await queryOne('SELECT * FROM head_codes WHERE id = $1', [id])
  return row ? toCamel<HeadCode>(row) : null
}

export async function getHeadCodeByCode(code: string): Promise<HeadCode | null> {
  const row = await queryOne('SELECT * FROM head_codes WHERE lower(code) = lower($1)', [code])
  return row ? toCamel<HeadCode>(row) : null
}

/** Create if missing, otherwise return the existing row — used by the Master Data "Add" form. */
export async function findOrCreateHeadCode(
  input: { code: string; name: string; majorId?: string | null },
  createdById: string | null,
  isSystemDefined = false
): Promise<HeadCode> {
  const existing = await getHeadCodeByCode(input.code)
  if (existing) return existing
  const row = await queryOne(
    `INSERT INTO head_codes (code, name, major_id, is_system_defined, created_by_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.code, input.name, input.majorId ?? null, isSystemDefined, createdById]
  )
  return toCamel<HeadCode>(row!)
}

/** Edit an existing Minor's code/name/Major assignment. */
export async function updateHeadCode(
  id: string,
  input: { code?: string; name?: string; majorId?: string | null; isActive?: boolean }
): Promise<HeadCode | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let i = 1
  if (input.code !== undefined) { sets.push(`code = $${i++}`); params.push(input.code) }
  if (input.name !== undefined) { sets.push(`name = $${i++}`); params.push(input.name) }
  if (input.majorId !== undefined) { sets.push(`major_id = $${i++}`); params.push(input.majorId) }
  if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(input.isActive) }
  if (sets.length === 0) return getHeadCodeById(id)
  params.push(id)
  const row = await queryOne(`UPDATE head_codes SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, params)
  return row ? toCamel<HeadCode>(row) : null
}

/** Hard delete. Blocked (pg 23503) if a Stage Manager config or file still references this head code. */
export async function deleteHeadCode(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM head_codes WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
