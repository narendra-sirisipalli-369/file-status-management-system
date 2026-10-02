import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

/** The CODE level — the deepest tier of the Major -> Minor -> Code hierarchy. headCodeId (its Minor) is optional — Master Data allows creating a Code with no parent assigned yet. */
export interface HeadCodeItem {
  id: string
  headCodeId: string | null
  code: string
  name: string
  isActive: boolean
  createdById: string | null
  createdAt: string
}

export async function listHeadCodeItems(headCodeId: string, opts: { activeOnly?: boolean } = {}): Promise<HeadCodeItem[]> {
  const rows = opts.activeOnly
    ? await query('SELECT * FROM head_code_items WHERE head_code_id = $1 AND is_active = true ORDER BY code ASC', [headCodeId])
    : await query('SELECT * FROM head_code_items WHERE head_code_id = $1 ORDER BY code ASC', [headCodeId])
  return toCamelRows<HeadCodeItem>(rows)
}

/** All CODE-level rows across every Minor — lets File Entry offer Code as a starting point, not just Major/Minor first. */
export async function listAllHeadCodeItems(opts: { activeOnly?: boolean } = {}): Promise<HeadCodeItem[]> {
  const rows = opts.activeOnly
    ? await query('SELECT * FROM head_code_items WHERE is_active = true ORDER BY code ASC')
    : await query('SELECT * FROM head_code_items ORDER BY code ASC')
  return toCamelRows<HeadCodeItem>(rows)
}

export async function getHeadCodeItemById(id: string): Promise<HeadCodeItem | null> {
  const row = await queryOne('SELECT * FROM head_code_items WHERE id = $1', [id])
  return row ? toCamel<HeadCodeItem>(row) : null
}

export async function findOrCreateHeadCodeItem(
  input: { headCodeId?: string | null; code: string; name: string },
  createdById: string | null
): Promise<HeadCodeItem> {
  const headCodeId = input.headCodeId ?? null
  const existing = headCodeId
    ? await queryOne('SELECT * FROM head_code_items WHERE head_code_id = $1 AND lower(code) = lower($2)', [headCodeId, input.code])
    : await queryOne('SELECT * FROM head_code_items WHERE head_code_id IS NULL AND lower(code) = lower($1)', [input.code])
  if (existing) return toCamel<HeadCodeItem>(existing)
  const row = await queryOne(
    `INSERT INTO head_code_items (head_code_id, code, name, created_by_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [headCodeId, input.code, input.name, createdById]
  )
  return toCamel<HeadCodeItem>(row!)
}

export async function updateHeadCodeItem(
  id: string,
  input: { code?: string; name?: string; headCodeId?: string | null; isActive?: boolean }
): Promise<HeadCodeItem | null> {
  const sets: string[] = []
  const params: unknown[] = []
  let i = 1
  if (input.code !== undefined) { sets.push(`code = $${i++}`); params.push(input.code) }
  if (input.name !== undefined) { sets.push(`name = $${i++}`); params.push(input.name) }
  if (input.headCodeId !== undefined) { sets.push(`head_code_id = $${i++}`); params.push(input.headCodeId) }
  if (input.isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(input.isActive) }
  if (sets.length === 0) return getHeadCodeItemById(id)
  params.push(id)
  const row = await queryOne(`UPDATE head_code_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, params)
  return row ? toCamel<HeadCodeItem>(row) : null
}

/** Hard delete. Blocked (pg 23503) if a file record still references this code. */
export async function deleteHeadCodeItem(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM head_code_items WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
