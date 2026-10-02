import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType } from 'docx'
import { isAdmin } from '@/lib/rbac'
import { listReportRows, parseReportFilters, type ReportRow } from '@/lib/repositories/reports'
import { formatDateTime } from '@/lib/qrService'

const COLUMNS = [
  { header: 'Case Description', width: 32 },
  { header: 'Proposal Value (INR)', width: 16 },
  { header: 'Department', width: 20 },
  { header: 'Head Code', width: 22 },
  { header: 'Mode of Procurement', width: 18 },
  { header: 'Authority', width: 18 },
  { header: 'File Entered', width: 16 },
  { header: 'Stage', width: 20 },
  { header: 'Entered', width: 16 },
  { header: 'Exited', width: 16 },
  { header: 'Action', width: 12 },
] as const

function toCells(r: ReportRow): string[] {
  return [
    r.description,
    Number(r.proposalValue).toLocaleString('en-IN'),
    r.departmentName,
    `${r.headCodeCode} — ${r.headCodeName}`,
    r.procurementModeName,
    r.authorityName,
    formatDateTime(r.fileEnteredAt),
    r.stageName,
    r.enteredAt ? formatDateTime(r.enteredAt) : '—',
    r.exitedAt ? formatDateTime(r.exitedAt) : '—',
    r.action,
  ]
}

async function buildXlsx(rows: ReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Report')
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.header, width: c.width }))
  sheet.getRow(1).font = { bold: true }
  for (const r of rows) {
    sheet.addRow(toCells(r))
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function buildPdf(rows: ReportRow[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 24, size: 'A4', layout: 'landscape' })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const bottom = doc.page.height - doc.page.margins.bottom
  const pageWidth = right - left
  const totalWeight = COLUMNS.reduce((s, c) => s + c.width, 0)
  const colWidths = COLUMNS.map((c) => (c.width / totalWeight) * pageWidth)
  const rowHeight = 20
  const fontSize = 7
  const pad = 3

  // Fixed row height, single-line cells (no wrapping) at an explicitly
  // tracked y — doc.y auto-advances by a different amount per cell when
  // text wraps, which is what produced the staggered/overlapping layout.
  function drawRow(cells: string[], y: number, bold: boolean) {
    let x = left
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize)
    cells.forEach((cell, i) => {
      doc.text(cell, x + pad, y + 5, {
        width: colWidths[i] - pad * 2,
        height: rowHeight,
        ellipsis: true,
        lineBreak: false,
      })
      x += colWidths[i]
    })
  }

  function drawGridLine(y: number) {
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#dddddd').lineWidth(0.5).stroke()
  }

  function drawHeaderRow(y: number): number {
    drawRow(COLUMNS.map((c) => c.header), y, true)
    const next = y + rowHeight
    drawGridLine(next)
    return next
  }

  doc.fontSize(14).font('Helvetica-Bold').text('File Status Report', left, doc.page.margins.top)
  let y = doc.page.margins.top + 22
  y = drawHeaderRow(y)

  for (const r of rows) {
    if (y + rowHeight > bottom) {
      doc.addPage()
      y = doc.page.margins.top
      y = drawHeaderRow(y)
    }
    drawRow(toCells(r), y, false)
    y += rowHeight
    drawGridLine(y)
  }

  doc.end()
  return done
}

async function buildDocx(rows: ReportRow[]): Promise<Buffer> {
  const headerRow = new TableRow({
    children: COLUMNS.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c.header, bold: true })] })],
        })
    ),
  })
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: toCells(r).map((cell) => new TableCell({ children: [new Paragraph(cell)] })),
      })
  )

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: 'File Status Report', bold: true, size: 32 })] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

/** GET /api/reports/export?format=xlsx|pdf|docx&<filters> — ADMIN only. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')
  if (!format || !['xlsx', 'pdf', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'format must be one of xlsx, pdf, docx' }, { status: 400 })
  }

  try {
    const rows = await listReportRows(parseReportFilters(searchParams))
    const filename = `file-status-report.${format}`

    let buffer: Buffer
    let contentType: string
    if (format === 'xlsx') {
      buffer = await buildXlsx(rows)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (format === 'pdf') {
      buffer = await buildPdf(rows)
      contentType = 'application/pdf'
    } else {
      buffer = await buildDocx(rows)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error({ err }, '[Reports Export GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
