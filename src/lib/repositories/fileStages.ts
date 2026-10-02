import type { PoolClient } from 'pg'
import { pool, toCamel, toCamelRows } from '@/lib/db'

export interface FileStage {
  id: string
  fileRecordId: string
  stageId: string
  sequenceOrder: number
  enteredAt: string | null
  enteredById: string | null
  exitedAt: string | null
  exitedById: string | null
  skipped: boolean
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface FileStageWithStage extends FileStage {
  stageName: string
}

/**
 * Copies a Stage Manager's ordered stage list into fresh FileStage rows for
 * one file. Called inside the file-creation transaction. The first stage is
 * entered immediately (entered_at set) — a newly created file is already
 * "at" its first stage, not merely queued in front of it.
 */
export async function createFileStagesFromStageManager(
  client: PoolClient,
  fileRecordId: string,
  stageManagerId: string,
  enteredByUserId: string | null
): Promise<void> {
  const { rows } = await client.query(
    `SELECT stage_id, sequence_order FROM stage_manager_stages WHERE stage_manager_id = $1 ORDER BY sequence_order ASC`,
    [stageManagerId]
  )
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (index === 0) {
      await client.query(
        `INSERT INTO file_stages (file_record_id, stage_id, sequence_order, entered_at, entered_by_id)
         VALUES ($1, $2, $3, now(), $4)`,
        [fileRecordId, row.stage_id, row.sequence_order, enteredByUserId]
      )
    } else {
      await client.query(
        `INSERT INTO file_stages (file_record_id, stage_id, sequence_order) VALUES ($1, $2, $3)`,
        [fileRecordId, row.stage_id, row.sequence_order]
      )
    }
  }
}

export async function listFileStages(fileRecordId: string, client?: PoolClient): Promise<FileStageWithStage[]> {
  const { rows } = await (client ?? pool).query(
    `SELECT fs.*, s.name AS stage_name
     FROM file_stages fs
     JOIN stages s ON s.id = fs.stage_id
     WHERE fs.file_record_id = $1
     ORDER BY fs.sequence_order ASC`,
    [fileRecordId]
  )
  return toCamelRows<FileStageWithStage>(rows)
}

export async function getFileStage(fileRecordId: string, stageId: string, client?: PoolClient): Promise<FileStage | null> {
  const { rows } = await (client ?? pool).query(
    'SELECT * FROM file_stages WHERE file_record_id = $1 AND stage_id = $2',
    [fileRecordId, stageId]
  )
  return rows[0] ? toCamel<FileStage>(rows[0]) : null
}

export async function markStageEntered(
  fileRecordId: string,
  stageId: string,
  actorUserId: string,
  remarks: string | null,
  client?: PoolClient
): Promise<FileStage> {
  const { rows } = await (client ?? pool).query(
    `UPDATE file_stages SET entered_at = now(), entered_by_id = $3, remarks = COALESCE($4, remarks)
     WHERE file_record_id = $1 AND stage_id = $2
     RETURNING *`,
    [fileRecordId, stageId, actorUserId, remarks]
  )
  return toCamel<FileStage>(rows[0])
}

export async function markStageExited(
  fileRecordId: string,
  stageId: string,
  actorUserId: string,
  remarks: string | null,
  client?: PoolClient,
  skipped = false
): Promise<FileStage> {
  const { rows } = await (client ?? pool).query(
    `UPDATE file_stages SET exited_at = now(), exited_by_id = $3, remarks = COALESCE($4, remarks), skipped = $5
     WHERE file_record_id = $1 AND stage_id = $2
     RETURNING *`,
    [fileRecordId, stageId, actorUserId, remarks, skipped]
  )
  return toCamel<FileStage>(rows[0])
}
