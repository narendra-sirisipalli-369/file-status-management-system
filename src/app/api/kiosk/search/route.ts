import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { listFileRecords } from '@/lib/repositories/fileRecords'
import { getFileDetail } from '@/lib/fileRecordService'

/**
 * GET /api/kiosk/search
 * Accepts: date/from/to, q/description, fileNo, departmentId.
 * Returns an array of matching files trimmed to what the kiosk UI shows.
 *
 * POST /api/kiosk/search — legacy exact-match search (smsRefNo + date) kept
 * for the original triple-factor kiosk flow.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = date ? `${date}T00:00:00.000Z` : searchParams.get('from') ?? undefined
    const to = date ? `${date}T23:59:59.999Z` : searchParams.get('to') ?? undefined
    const q = searchParams.get('q') ?? searchParams.get('description') ?? undefined
    const smsRefNo = searchParams.get('fileNo') ?? searchParams.get('smsRefNo') ?? undefined
    const departmentId = searchParams.get('departmentId') ?? searchParams.get('department') ?? undefined

    const files = await listFileRecords({ q, from, to, departmentId, smsRefNo })

    const trimmed = files.slice(0, 100).map((f) => ({
      id: f.id,
      fileId: f.fileId,
      smsRefNo: f.smsRefNo,
      description: f.description,
      dateSubmission: f.dateSubmission,
      status: f.status,
      currentStageName: f.currentStageName,
      departmentName: f.departmentName,
      proposalValue: f.proposalValue,
      headCodeCode: f.headCodeCode,
      procurementModeName: f.procurementModeName,
      authorityName: f.authorityName,
    }))

    return NextResponse.json({ files: trimmed })
  } catch (err) {
    logger.error({ err }, '[Kiosk Search GET]')
    return NextResponse.json({ files: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { smsRefNo, dateSubmission } = body

    if (!smsRefNo || !dateSubmission) {
      return NextResponse.json({ error: 'Reference Number and Date of Submission are required.' }, { status: 400 })
    }

    const detail = await getFileDetail(smsRefNo)
    if (!detail) {
      return NextResponse.json({ error: 'No matching file found. Please verify your Reference Number and Date.' }, { status: 404 })
    }

    const submittedDay = new Date(detail.file.dateSubmission).toISOString().slice(0, 10)
    if (submittedDay !== dateSubmission) {
      return NextResponse.json({ error: 'No matching file found. Please verify your Reference Number and Date.' }, { status: 404 })
    }

    return NextResponse.json({ file: { ...detail.file, histories: detail.histories, stages: detail.stages } })
  } catch (err) {
    logger.error({ err }, '[Kiosk Search POST]')
    return NextResponse.json({ error: 'No matching file found.' }, { status: 404 })
  }
}
