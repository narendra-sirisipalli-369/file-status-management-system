import type { PoolClient, QueryResultRow } from 'pg'
import { query, queryOne, toCamel, toCamelRows, withTransaction } from '@/lib/db'

/** Runs on the given transaction client if provided, otherwise on the shared pool. */
async function runQuery<T extends QueryResultRow>(client: PoolClient | undefined, text: string, params: unknown[] = []): Promise<T[]> {
  if (client) return (await client.query<T>(text, params)).rows
  return query<T>(text, params)
}
async function runQueryOne<T extends QueryResultRow>(client: PoolClient | undefined, text: string, params: unknown[] = []): Promise<T | null> {
  if (client) return (await client.query<T>(text, params)).rows[0] ?? null
  return queryOne<T>(text, params)
}

export interface StageManager {
  id: string
  procurementModeId: string
  authorityId: string
  isActive: boolean
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface StageManagerStageEntry {
  stageId: string
  stageName: string
  sequenceOrder: number
}

export interface StageManagerWithStages extends StageManager {
  procurementModeName: string
  authorityName: string
  stages: StageManagerStageEntry[]
}

async function attachStages(configs: StageManager[], client?: PoolClient): Promise<StageManagerWithStages[]> {
  if (configs.length === 0) return []
  const ids = configs.map((c) => c.id)
  const stageRows = toCamelRows<{ stageManagerId: string; stageId: string; stageName: string; sequenceOrder: number }>(
    await runQuery(
      client,
      `SELECT sms.stage_manager_id, sms.stage_id, s.name AS stage_name, sms.sequence_order
       FROM stage_manager_stages sms
       JOIN stages s ON s.id = sms.stage_id
       WHERE sms.stage_manager_id = ANY($1::uuid[])
       ORDER BY sms.sequence_order ASC`,
      [ids]
    )
  )
  return configs.map((c) => ({
    ...c,
    stages: stageRows
      .filter((r) => r.stageManagerId === c.id)
      .map((r) => ({ stageId: r.stageId, stageName: r.stageName, sequenceOrder: r.sequenceOrder })),
  })) as StageManagerWithStages[]
}

export async function listStageManagers(opts: { activeOnly?: boolean } = {}): Promise<StageManagerWithStages[]> {
  const rows = toCamelRows<StageManager & { procurementModeName: string; authorityName: string }>(
    await query(
      `SELECT sm.*, pm.name AS procurement_mode_name, a.name AS authority_name
       FROM stage_managers sm
       JOIN procurement_modes pm ON pm.id = sm.procurement_mode_id
       JOIN authorities a ON a.id = sm.authority_id
       ${opts.activeOnly ? 'WHERE sm.is_active = true' : ''}
       ORDER BY sm.created_at DESC`
    )
  )
  return attachStages(rows) as unknown as Promise<StageManagerWithStages[]>
}

export async function getStageManagerById(id: string, client?: PoolClient): Promise<StageManagerWithStages | null> {
  const row = await runQueryOne<Record<string, unknown>>(client, 'SELECT * FROM stage_managers WHERE id = $1', [id])
  if (!row) return null
  const [withStages] = await attachStages([toCamel<StageManager>(row)], client)
  return withStages
}

/** The lookup the file-creation flow depends on: which config applies for this exact combo. */
export async function findStageManagerForCombo(
  procurementModeId: string,
  authorityId: string
): Promise<StageManagerWithStages | null> {
  const row = await queryOne(
    `SELECT * FROM stage_managers
     WHERE procurement_mode_id = $1 AND authority_id = $2 AND is_active = true`,
    [procurementModeId, authorityId]
  )
  if (!row) return null
  const [withStages] = await attachStages([toCamel<StageManager>(row)])
  return withStages
}

export async function createStageManager(input: {
  procurementModeId: string
  authorityId: string
  stageIds: string[] // in display order
  createdById: string | null
}): Promise<StageManagerWithStages> {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO stage_managers (procurement_mode_id, authority_id, created_by_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.procurementModeId, input.authorityId, input.createdById]
    )
    const stageManager = toCamel<StageManager>(rows[0])

    let order = 1
    for (const stageId of input.stageIds) {
      await client.query(
        `INSERT INTO stage_manager_stages (stage_manager_id, stage_id, sequence_order) VALUES ($1, $2, $3)`,
        [stageManager.id, stageId, order++]
      )
    }

    const config = await getStageManagerById(stageManager.id, client)
    return config!
  })
}

export async function setStageManagerActive(id: string, isActive: boolean): Promise<void> {
  await query('UPDATE stage_managers SET is_active = $2 WHERE id = $1', [id, isActive])
}

/** Replaces a config's stage list wholesale — used by the "Edit Stages" flow. */
export async function updateStageManagerStages(id: string, stageIds: string[]): Promise<StageManagerWithStages | null> {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM stage_manager_stages WHERE stage_manager_id = $1', [id])
    let order = 1
    for (const stageId of stageIds) {
      await client.query(
        `INSERT INTO stage_manager_stages (stage_manager_id, stage_id, sequence_order) VALUES ($1, $2, $3)`,
        [id, stageId, order++]
      )
    }
    return getStageManagerById(id, client)
  })
}

/** Hard delete. Blocked (pg 23503) if a file was already created against this config. */
export async function deleteStageManager(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM stage_managers WHERE id = $1 RETURNING id', [id])
  return rows.length > 0
}
