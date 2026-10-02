import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export interface LookupRow {
  id: string
  name: string
  isSystemDefined: boolean
  isActive: boolean
  createdById: string | null
  createdAt: string
}

/**
 * ProcurementMode, Authority, and RemarksBy are identical shapes (name +
 * growable "Other" flag), so share one factory instead of duplicating the
 * same five queries three times.
 */
export function createLookupRepository(table: 'procurement_modes' | 'authorities' | 'remarks_by') {
  return {
    async list(opts: { activeOnly?: boolean } = {}): Promise<LookupRow[]> {
      const rows = opts.activeOnly
        ? await query(`SELECT * FROM ${table} WHERE is_active = true ORDER BY name ASC`)
        : await query(`SELECT * FROM ${table} ORDER BY name ASC`)
      return toCamelRows<LookupRow>(rows)
    },

    async getById(id: string): Promise<LookupRow | null> {
      const row = await queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id])
      return row ? toCamel<LookupRow>(row) : null
    },

    async getByName(name: string): Promise<LookupRow | null> {
      const row = await queryOne(`SELECT * FROM ${table} WHERE lower(name) = lower($1)`, [name])
      return row ? toCamel<LookupRow>(row) : null
    },

    /** Create if missing, otherwise return the existing row — used by the Master Data "Add" form. */
    async findOrCreate(name: string, createdById: string | null, isSystemDefined = false): Promise<LookupRow> {
      const existing = await this.getByName(name)
      if (existing) return existing
      const row = await queryOne(
        `INSERT INTO ${table} (name, is_system_defined, created_by_id) VALUES ($1, $2, $3) RETURNING *`,
        [name, isSystemDefined, createdById]
      )
      return toCamel<LookupRow>(row!)
    },

    async setActive(id: string, isActive: boolean): Promise<LookupRow | null> {
      const row = await queryOne(`UPDATE ${table} SET is_active = $2 WHERE id = $1 RETURNING *`, [id, isActive])
      return row ? toCamel<LookupRow>(row) : null
    },

    /** Hard delete. Blocked (pg 23503) if a Stage Manager config or file still references this row. */
    async remove(id: string): Promise<boolean> {
      const rows = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id])
      return rows.length > 0
    },
  }
}
