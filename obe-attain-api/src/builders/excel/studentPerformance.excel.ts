import ExcelJS from 'exceljs'
import type { StudentPerformanceReportData } from '../builder.types'
import {
  COLORS,
  applyHeaderStyle,
  applyDataRowStyle,
  addInstitutionHeader,
  setColumnWidths,
  freezeHeaderRows,
  writeWorkbookBuffer,
} from './excelBase.utils'

const MAX_MARKS = { ia: 50, modelExam: 100, ese: 100, assignment: 10, lab: 25 }
const GRAND_MAX = MAX_MARKS.ia + MAX_MARKS.ese  // 150 for % calculation

export async function buildStudentPerformanceExcel(
  data: StudentPerformanceReportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OBE Attain'
  wb.created = new Date()

  // ── Sheet 1: Mark Sheet ────────────────────────────────────────────────────
  const s1 = wb.addWorksheet('Mark Sheet')

  addInstitutionHeader(s1, {
    institution:  data.institution,
    department:   data.department,
    title:        `Mark Sheet — ${data.subject.code} (Semester ${data.subject.semester})`,
    academicYear: data.academicYear,
  })

  // Subject + faculty info — rows 6–7
  const r6 = s1.getRow(6)
  r6.getCell(1).value = 'Subject:'; r6.getCell(1).font = { bold: true, size: 10 }
  r6.getCell(2).value = `${data.subject.code} — ${data.subject.name}`
  r6.getCell(4).value = 'Regulation:'; r6.getCell(4).font = { bold: true, size: 10 }
  r6.getCell(5).value = data.regulation
  const r7 = s1.getRow(7)
  r7.getCell(1).value = 'Faculty:';  r7.getCell(1).font = { bold: true, size: 10 }
  r7.getCell(2).value = data.faculty.join(', ')

  // Column headers — row 9
  const COL_HEADERS = [
    'Roll No.', 'Name',
    `IA1\n(/50)`, `IA2\n(/50)`, `IA3\n(/50)`, `IA Avg\n(/50)`,
    `Model\n(/100)`, `ESE\n(/100)`, `Asgmt\n(/10)`, `Lab\n(/25)`,
    `Total\n(/150)`, `%`, 'Result',
  ]
  const hdrRow = s1.getRow(9)
  hdrRow.height = 32
  COL_HEADERS.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell, { fontSize: 10 })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  // Max marks reference row — row 10
  const maxRow = s1.getRow(10)
  maxRow.height = 18
  const maxValues = ['Max', '—', 50, 50, 50, 50, 100, 100, 10, 25, 150, '100%', '—']
  maxValues.forEach((v, i) => {
    const cell = maxRow.getCell(i + 1)
    cell.value = v as ExcelJS.CellValue
    cell.font  = { italic: true, color: { argb: 'FF9398B0' }, size: 9 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5F8' } }
  })

  // Student data rows — start row 11
  let lastDataRow = 10
  data.students.forEach((st, idx) => {
    const row   = s1.getRow(11 + idx)
    row.height  = 18
    const isAlt = idx % 2 === 1
    const vals: (string | number | null)[] = [
      st.rollNumber, st.name,
      st.ia1, st.ia2, st.ia3, st.iaAverage,
      st.modelExam, st.ese, st.assignment, st.lab,
      st.total, st.percentage !== null ? parseFloat(st.percentage.toFixed(2)) : null,
      st.result,
    ]
    vals.forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.value = v as ExcelJS.CellValue
      if (j === 12) {
        // Result column — colour coded
        const resultColors: Record<string, { bg: string; fg: string }> = {
          Pass:   { bg: COLORS.tealLight,  fg: COLORS.teal },
          Fail:   { bg: COLORS.redLight,   fg: COLORS.red },
          Absent: { bg: 'FEF4E4',          fg: COLORS.amber },
        }
        const rc = resultColors[st.result] ?? { bg: COLORS.white, fg: COLORS.primary }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${rc.bg}` } }
        cell.font = { color: { argb: `FF${rc.fg}` }, bold: true, size: 10 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else {
        applyDataRowStyle(cell, isAlt)
        if (j >= 2) cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })
    lastDataRow = 11 + idx
  })

  setColumnWidths(s1, [12, 28, 8, 8, 8, 8, 9, 9, 9, 9, 10, 8, 10])
  freezeHeaderRows(s1, 10)
  // Also freeze first 2 columns (roll no + name)
  s1.views = [{ state: 'frozen', xSplit: 2, ySplit: 10 }]

  // ── Sheet 2: Class Statistics ──────────────────────────────────────────────
  const s2 = wb.addWorksheet('Class Statistics')

  addInstitutionHeader(s2, {
    institution:  data.institution,
    department:   data.department,
    title:        `Class Statistics — ${data.subject.code}`,
    academicYear: data.academicYear,
  })

  const stats = data.classStats
  const statRows: [string, string | number][] = [
    ['Total Students',       stats.totalStudents],
    ['Appeared',             stats.appeared],
    ['Passed',               stats.passed],
    ['Pass Percentage',      `${stats.passPercentage.toFixed(2)}%`],
    ['Class Average',        `${stats.classAverage.toFixed(2)}%`],
    ['Highest Mark (%)',     `${stats.highest.toFixed(2)}%`],
    ['Lowest Mark (%)',      `${stats.lowest.toFixed(2)}%`],
    ['Failed',               stats.appeared - stats.passed],
    ['Absent',               stats.totalStudents - stats.appeared],
  ]

  // Stat table header — row 7
  const statHdr = s2.getRow(7)
  statHdr.height = 22
  ;['Metric', 'Value'].forEach((h, i) => {
    const c = statHdr.getCell(i + 1)
    c.value = h
    applyHeaderStyle(c)
  })

  statRows.forEach(([label, value], i) => {
    const row = s2.getRow(8 + i)
    row.height = 20
    const isAlt = i % 2 === 1
    const lc = row.getCell(1)
    lc.value = label
    lc.font  = { bold: true, size: 10 }
    applyDataRowStyle(lc, isAlt)

    const vc = row.getCell(2)
    vc.value = value as ExcelJS.CellValue
    vc.font  = { size: 10 }
    applyDataRowStyle(vc, isAlt)
    vc.alignment = { horizontal: 'center' }
  })

  setColumnWidths(s2, [30, 20])

  return writeWorkbookBuffer(wb)
}
