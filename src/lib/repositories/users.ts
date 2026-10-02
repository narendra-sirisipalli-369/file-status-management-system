import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export type UserRole = 'ADMIN' | 'USER' | 'KIOSK'

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  departmentId: string | null
  mobileNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserWithDepartment extends Omit<User, 'password'> {
  departmentName: string | null
}

const PUBLIC_COLUMNS = `
  u.id, u.username, u.role, u.department_id, u.mobile_number, u.is_active, u.created_at, u.updated_at,
  d.name AS department_name
`

export async function findUserByUsername(username: string): Promise<User | null> {
  const row = await queryOne('SELECT * FROM users WHERE username = $1', [username])
  return row ? toCamel<User>(row) : null
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  return row ? toCamel<User>(row) : null
}

export async function listUsers(): Promise<UserWithDepartment[]> {
  const rows = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     ORDER BY u.created_at DESC`
  )
  return toCamelRows<UserWithDepartment>(rows)
}

/** Public, unauthenticated listing used to populate the login dropdown — username/role/department only. */
export async function listUsersPublic(): Promise<{ username: string; role: UserRole; departmentName: string | null }[]> {
  const rows = await query(
    `SELECT u.username, u.role, d.name AS department_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     ORDER BY u.username ASC`
  )
  return toCamelRows(rows)
}

export async function createUser(input: {
  username: string
  password: string
  role: UserRole
  departmentId: string | null
  mobileNumber: string | null
}): Promise<UserWithDepartment> {
  const row = await queryOne(
    `INSERT INTO users (username, password, role, department_id, mobile_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, role, department_id, mobile_number, is_active, created_at, updated_at`,
    [input.username, input.password, input.role, input.departmentId, input.mobileNumber]
  )
  return toCamel<UserWithDepartment>(row!)
}

export async function updateUser(
  id: string,
  input: { username?: string; password?: string; mobileNumber?: string | null }
): Promise<UserWithDepartment | null> {
  const updates: string[] = []
  const params: unknown[] = []
  let i = 1

  if (input.username !== undefined) {
    updates.push(`username = $${i}`)
    params.push(input.username)
    i++
  }
  if (input.password !== undefined) {
    updates.push(`password = $${i}`)
    params.push(input.password)
    i++
  }
  if (input.mobileNumber !== undefined) {
    updates.push(`mobile_number = $${i}`)
    params.push(input.mobileNumber)
    i++
  }

  if (updates.length === 0) {
    return null
  }

  params.push(id)
  const row = await queryOne(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${PUBLIC_COLUMNS}`,
    params
  )
  return row ? toCamel<UserWithDepartment>(row) : null
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
