import { query, queryOne, toCamel, toCamelRows } from '@/lib/db'

export type StageType = 'IN' | 'OUT'

export interface Stage {
  id: string
  name: string
  stageType: StageType
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export async function listStages(opts: { activeOnly?: boolean } = {}): Promise<Stage[]> {
  const rows = opts.activeOnly
    ? await query(`SELECT * FROM stages WHERE is_active = true ORDER BY display_order ASC, name ASC`)
    : await query(`SELECT * FROM stages ORDER BY display_order ASC, name ASC`)
  return toCamelRows<Stage>(rows)
}

export async function getStageById(id: string): Promise<Stage | null> {
  const row = await queryOne('SELECT * FROM stages WHERE id = $1', [id])
  return row ? toCamel<Stage>(row) : null
}

export async function createStage(input: { name: string; stageType: StageType }): Promise<Stage> {
  const row = await queryOne(
    `INSERT INTO stages (name, stage_type, display_order)
     VALUES ($1, $2, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM stages))
     RETURNING *`,
    [input.name, input.stageType]
  )
  return toCamel<Stage>(row!)
}

export async function updateStage(
  id: string,
  input: Partial<{ name: string; stageType: StageType; isActive: boolean; displayOrder: number }>
): Promise<Stage | null> {
  const row = await queryOne(
    `UPDATE stages SET
       name = COALESCE($2, name),
       stage_type = COALESCE($3, stage_type),
       is_active = COALESCE($4, is_active),
       display_order = COALESCE($5, display_order)
     WHERE id = $1
     RETURNING *`,
    [id, input.name ?? null, input.stageType ?? null, input.isActive ?? null, input.displayOrder ?? null]
  )
  return row ? toCamel<Stage>(row) : null
}

/**
 * Hard-deletes stages one at a time so one FK-protected stage (already used
 * by a Stage Manager config or a file) doesn't block deletion of the rest of
 * the selection — the caller reports back which ids succeeded vs were blocked.
 */
export async function deleteStages(ids: string[]): Promise<{ deleted: string[]; blocked: string[] }> {
  const deleted: string[] = []
  const blocked: string[] = []
  for (const id of ids) {
    try {
      await query('DELETE FROM stages WHERE id = $1', [id])
      deleted.push(id)
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
        blocked.push(id)
      } else {
        throw err
      }
    }
  }
  return { deleted, blocked }
}
