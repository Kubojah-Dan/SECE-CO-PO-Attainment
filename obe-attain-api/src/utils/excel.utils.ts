import ExcelJS from 'exceljs'
import fs from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseError {
  row: number
  issue: string
}

export interface StudentRow {
  rollNumber: string
  name: string
  email?: string
  batch: string
}

export interface MarkRow {
  rollNumber: string
  mark: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BATCH_REGEX = /^\d{4}-\d{2}$/

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join('')
      .trim()
  }
  return String(v).trim()
}

function cellNum(cell: ExcelJS.Cell): number | null {
  const v = cell.value
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

// ─── parseStudentImport ───────────────────────────────────────────────────────

export async function parseStudentImport(filePath: string): Promise<{
  valid: StudentRow[]
  errors: ParseError[]
}> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheet = workbook.worksheets[0]
  const valid: StudentRow[] = []
  const errors: ParseError[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const rollNumber = cellStr(row.getCell(1))
    const name = cellStr(row.getCell(2))
    const emailRaw = cellStr(row.getCell(3))
    const batch = cellStr(row.getCell(4))

    // Skip completely empty rows silently
    if (!rollNumber && !name && !emailRaw && !batch) return

    const rowErrors: string[] = []

    if (!rollNumber) rowErrors.push('Roll Number is required')
    if (!name) rowErrors.push('Name is required')
    else if (name.length > 100) rowErrors.push('Name must not exceed 100 characters')

    if (emailRaw && !EMAIL_REGEX.test(emailRaw)) {
      rowErrors.push(`Invalid email: ${emailRaw}`)
    }

    if (!batch) {
      rowErrors.push('Batch is required')
    } else if (!BATCH_REGEX.test(batch)) {
      rowErrors.push('Batch must be in format YYYY-YY (e.g. 2022-26)')
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, issue: rowErrors.join('; ') })
    } else {
      const entry: StudentRow = { rollNumber, name, batch }
      if (emailRaw) entry.email = emailRaw
      valid.push(entry)
    }
  })

  return { valid, errors }
}

// ─── parseMarksImport ─────────────────────────────────────────────────────────

export async function parseMarksImport(
  filePath: string,
  _component: string
): Promise<{
  valid: MarkRow[]
  errors: ParseError[]
}> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheet = workbook.worksheets[0]
  const valid: MarkRow[] = []
  const errors: ParseError[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const rollNumber = cellStr(row.getCell(1))
    const mark = cellNum(row.getCell(2))

    if (!rollNumber && mark === null) return // empty row

    const rowErrors: string[] = []

    if (!rollNumber) rowErrors.push('Roll Number is required')
    if (mark === null) rowErrors.push('Mark is required and must be a number')
    else if (mark < 0) rowErrors.push('Mark cannot be negative')

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, issue: rowErrors.join('; ') })
    } else {
      valid.push({ rollNumber, mark: mark as number })
    }
  })

  return { valid, errors }
}

// ─── generateStudentTemplate ──────────────────────────────────────────────────

export async function generateStudentTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Students')

  // Columns
  sheet.columns = [
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Batch', key: 'batch', width: 12 },
  ]

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1F4E' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 22

  // Example row
  sheet.addRow({
    rollNumber: 'CS22001',
    name: 'Arjun R',
    email: 'cs22001@college.edu',
    batch: '2022-26',
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

// ─── generateMarksTemplate ────────────────────────────────────────────────────

export async function generateMarksTemplate(
  students: { rollNumber: string; name: string }[],
  component: string,
  maxMark: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Marks')

  sheet.columns = [
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Name', key: 'name', width: 28 },
    { header: `${component} (max: ${maxMark})`, key: 'mark', width: 20 },
  ]

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1F4E' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 22

  // Pre-fill student rows
  for (const s of students) {
    sheet.addRow({ rollNumber: s.rollNumber, name: s.name, mark: '' })
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

// ─── cleanupUpload ────────────────────────────────────────────────────────────

export function cleanupUpload(filePath: string): void {
  // Fire-and-forget — never throw
  fs.unlink(filePath, () => undefined)
}
