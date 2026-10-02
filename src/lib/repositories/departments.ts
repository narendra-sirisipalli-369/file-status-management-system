import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export interface Department {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export async function listDepartments(opts: { activeOnly?: boolean } = {}): Promise<Department[]> {
  const rows = opts.activeOnly
    ? await query('SELECT * FROM departments WHERE is_active = true ORDER BY name ASC')
    : await query('SELECT * FROM departments ORDER BY name ASC')
  return toCamelRows<Department>(rows)
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  const row = await queryOne('SELECT * FROM departments WHERE id = $1', [id])
  return row ? toCamel<Department>(row) : null
}

export async function createDepartment(input: { name: string; code: string }): Promise<Department> {
  const row = await queryOne(
    `INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *`,
    [input.name, input.code]
  )
  return toCamel<Department>(row!)
}

/** Hard delete. Blocked (pg 23503) if a user, stage, or file still references this department. */
export async function deleteDepartment(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM departments WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}

export async function updateDepartment(
  id: string,
  input: { name?: string; code?: string; isActive?: boolean }
): Promise<Department | null> {
  const row = await queryOne(
    `UPDATE departments SET
       name = COALESCE($2, name),
       code = COALESCE($3, code),
       is_active = COALESCE($4, is_active)
     WHERE id = $1
     RETURNING *`,
    [id, input.name ?? null, input.code ?? null, input.isActive ?? null]
  )
  return row ? toCamel<Department>(row) : null
}
