import { z } from 'zod'
import { withTransaction } from '@/lib/db'
import { logger } from '@/lib/logger'
import { formatDateTime } from '@/lib/qrService'
import { generateSecureTrackingId } from '@/lib/trackingId'
import { countFileRecords, insertFileRecord, advanceCurrentStage, getFileRecordByAnyId, findSimilarFileDescriptions, headCodeSelectionExists, type FileRecordWithNames } from '@/lib/repositories/fileRecords'
import { createFileStagesFromStageManager, listFileStages, getFileStage, markStageEntered, markStageExited } from '@/lib/repositories/fileStages'
import { findStageManagerForCombo } from '@/lib/repositories/stageManager'
import { recordHistory, listHistoryForFile } from '@/lib/repositories/statusHistory'
import { getDepartmentKioskMobile, enqueueSms, resolveActorName } from '@/lib/repositories/smsQueue'

export const fileEntrySchema = z.object({
  description: z.string().min(5),
  proposalValue: z.number().positive(),
  departmentId: z.string().uuid(),
  procurementModeId: z.string().uuid(),
  authorityId: z.string().uuid(),
  /** Major -> Minor -> Code hierarchy, all selectable together. Major is required; Minor and Code are optional finer classification. */
  majorHeadId: z.string().uuid(),
  minorHeadId: z.string().uuid().nullable().optional(),
  codeHeadId: z.string().uuid().nullable().optional(),
  /** User has seen the existing file(s) with this exact description and explicitly chose to create a new one anyway. */
  allowDuplicate: z.boolean().optional(),
})

export type FileEntryInput = z.infer<typeof fileEntrySchema>

export class StageManagerNotConfiguredError extends Error {
  constructor() {
    super(
      'No Procurement Process configuration exists for this Procurement Mode + Authority combination yet. Configure it in Procurement Process first.'
    )
    this.name = 'StageManagerNotConfiguredError'
  }
}

export class DuplicateFileDescriptionError extends Error {
  constructor(public existingSmsRefNo: string) {
    super(`A file with this exact description already exists (${existingSmsRefNo}). Use a different, more specific description.`)
    this.name = 'DuplicateFileDescriptionError'
  }
}

export class InvalidHeadCodeError extends Error {
  constructor() {
    super('Selected Major/Minor/Code head no longer exists — please pick again.')
    this.name = 'InvalidHeadCodeError'
  }
}

export async function createFileRecord(input: FileEntryInput, audit: { userId: string | null }) {
  const stageManager = await findStageManagerForCombo(input.procurementModeId, input.authorityId)
  if (!stageManager || stageManager.stages.length === 0) {
    throw new StageManagerNotConfiguredError()
  }

  const headCodeSelection = {
    majorHeadId: input.majorHeadId,
    minorHeadId: input.minorHeadId ?? null,
    codeHeadId: input.codeHeadId ?? null,
  }
  if (!(await headCodeSelectionExists(headCodeSelection))) {
    throw new InvalidHeadCodeError()
  }

  const exactDuplicate = (await findSimilarFileDescriptions(input.description, 1)).find(
    (m) => m.description.trim().toLowerCase() === input.description.trim().toLowerCase()
  )
  if (exactDuplicate && !input.allowDuplicate) {
    throw new DuplicateFileDescriptionError(exactDuplicate.smsRefNo)
  }

  const nextSeq = (await countFileRecords()) + 201
  const smsRefNo = `SMS/LOG/${nextSeq}`
  const secureTrackingId = generateSecureTrackingId(smsRefNo)
  const firstStage = stageManager.stages[0]

  return withTransaction(async (client) => {
    const fileRecord = await insertFileRecord(client, {
      secureTrackingId,
      smsRefNo,
      description: input.description,
      proposalValue: input.proposalValue,
      procurementModeId: input.procurementModeId,
      authorityId: input.authorityId,
      majorHeadId: headCodeSelection.majorHeadId,
      minorHeadId: headCodeSelection.minorHeadId,
      codeHeadId: headCodeSelection.codeHeadId,
      stageManagerId: stageManager.id,
      departmentId: input.departmentId,
      createdById: audit.userId,
      currentStageId: firstStage.stageId,
    })

    await createFileStagesFromStageManager(client, fileRecord.id, stageManager.id, audit.userId)

    await client.query(
      `INSERT INTO status_history (file_record_id, stage_id, action, remarks, actor_user_id)
       VALUES ($1, $2, 'CREATED', NULL, $3)`,
      [fileRecord.id, firstStage.stageId, audit.userId]
    )

    logger.info(
      { event: 'file_created', fileRecordId: fileRecord.id, smsRefNo, description: input.description, userId: audit.userId },
      'File created'
    )

    const kioskMobile = await getDepartmentKioskMobile(input.departmentId, client)
    if (kioskMobile) {
      await enqueueSms(
        {
          recipient: kioskMobile,
          message: `File Ref: ${smsRefNo} | File Name: ${input.description} | FILE ENTERED on ${formatDateTime(new Date())} | Stage: ${firstStage.stageName}`,
          fileRecordId: fileRecord.id,
          departmentId: input.departmentId,
          actorUserId: audit.userId,
          remarks: null,
        },
        client
      )
    }

    return fileRecord
  })
}

export class StageActionError extends Error {}

/**
 * Exits the file's current stage and, in the same transaction, enters the
 * next one immediately (stamping its entered_at/entered_by_id) — there is no
 * separate manual "Enter" step. If there's no next stage, the file is marked
 * COMPLETED instead.
 *
 * `skip: true` bypasses the stage without remarks and without sending the
 * kiosk SMS — logged as STAGE_SKIPPED instead of STAGE_EXITED so the audit
 * trail can tell the two apart.
 */
export async function advanceFileStage(
  fileRecordId: string,
  actorUserId: string,
  remarks: string | null,
  remarksById: string | null = null,
  options: { skip?: boolean } = {}
) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      current_stage_id: string | null
      department_id: string
      sms_ref_no: string
      description: string
    }>(
      'SELECT current_stage_id, department_id, sms_ref_no, description FROM file_records WHERE id = $1 FOR UPDATE',
      [fileRecordId]
    )
    const currentStageId = rows[0]?.current_stage_id
    if (!currentStageId) {
      throw new StageActionError('This file has no active stage — it may already be completed.')
    }
    const { department_id: departmentId, sms_ref_no: smsRefNo, description } = rows[0]

    const stage = await getFileStage(fileRecordId, currentStageId, client)
    if (stage?.exitedAt) {
      throw new StageActionError('This stage has already been exited.')
    }

    await markStageExited(fileRecordId, currentStageId, actorUserId, remarks, client, !!options.skip)
    await recordHistory(
      { fileRecordId, stageId: currentStageId, action: options.skip ? 'STAGE_SKIPPED' : 'STAGE_EXITED', remarks, remarksById, actorUserId },
      client
    )

    const allStages = await listFileStages(fileRecordId, client)
    const currentIndex = allStages.findIndex((s) => s.stageId === currentStageId)
    const next = allStages[currentIndex + 1] ?? null

    if (next) {
      await markStageEntered(fileRecordId, next.stageId, actorUserId, null, client)
    }

    await advanceCurrentStage(fileRecordId, next?.stageId ?? null, client)
    await recordHistory(
      {
        fileRecordId,
        stageId: next?.stageId ?? currentStageId,
        action: next ? 'ADVANCED' : 'FILE_COMPLETED',
        remarks: null,
        actorUserId,
      },
      client
    )

    logger.info(
      {
        event: next ? 'file_stage_advanced' : 'file_completed',
        fileRecordId,
        fromStageId: currentStageId,
        toStageId: next?.stageId ?? null,
        userId: actorUserId,
        skipped: !!options.skip,
      },
      next ? 'File advanced to next stage' : 'File completed'
    )

    if (options.skip) return

    const kioskMobile = await getDepartmentKioskMobile(departmentId, client)
    if (kioskMobile) {
      const now = formatDateTime(new Date())
      const base = next
        ? `File Ref: ${smsRefNo} | File Name: ${description} | STAGE UPDATED to "${next.stageName}" on ${now}`
        : `File Ref: ${smsRefNo} | File Name: ${description} | ALL STAGES COMPLETED on ${now}`
      let message = base
      if (remarks) {
        const byName = await resolveActorName(actorUserId, remarksById, client)
        message = `${base} Remarks by ${byName ?? 'Unknown'}: ${remarks}`
      }
      await enqueueSms({ recipient: kioskMobile, message, fileRecordId, departmentId, actorUserId, remarks }, client)
    }
  })
}

/**
 * Sends a remark as a message to the department kiosk without exiting the
 * current stage — the file stays put; it does not advance. Used for
 * "returned" remarks that need a response before the stage can be exited.
 */
export async function sendStageRemarks(fileRecordId: string, actorUserId: string, remarks: string, remarksById: string | null) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      current_stage_id: string | null
      department_id: string
      sms_ref_no: string
      description: string
    }>(
      'SELECT current_stage_id, department_id, sms_ref_no, description FROM file_records WHERE id = $1 FOR UPDATE',
      [fileRecordId]
    )
    const currentStageId = rows[0]?.current_stage_id
    if (!currentStageId) {
      throw new StageActionError('This file has no active stage — it may already be completed.')
    }
    const { department_id: departmentId, sms_ref_no: smsRefNo, description } = rows[0]

    await recordHistory({ fileRecordId, stageId: currentStageId, action: 'REMARKS_UPDATED', remarks, remarksById, actorUserId }, client)

    const kioskMobile = await getDepartmentKioskMobile(departmentId, client)
    if (kioskMobile) {
      const byName = await resolveActorName(actorUserId, remarksById, client)
      const now = formatDateTime(new Date())
      const message = `File Ref: ${smsRefNo} | File Name: ${description} | REMARKS on ${now} by ${byName ?? 'Unknown'}: ${remarks}`
      await enqueueSms({ recipient: kioskMobile, message, fileRecordId, departmentId, actorUserId, remarks }, client)
    }

    logger.info({ event: 'file_remarks_sent', fileRecordId, stageId: currentStageId, userId: actorUserId }, 'Remarks sent, stage held')
  })
}

/** Full detail view used by the file-detail page, qr-resolver, and the ?ref= lookup on the file list endpoint. */
export async function getFileDetail(identifier: string) {
  const file = await getFileRecordByAnyId(identifier)
  if (!file) return null
  const [stages, histories] = await Promise.all([listFileStages(file.id), listHistoryForFile(file.id)])
  return { file, stages, histories }
}

export type { FileRecordWithNames }
