import ExcelJS from 'exceljs'
import type { POAttainmentReportData } from '../builder.types'
import {
  COLORS,
  applyHeaderStyle,
  applyDataRowStyle,
  applyAttainmentStyle,
  addInstitutionHeader,
  setColumnWidths,
  addPageFooter,
  writeWorkbookBuffer,
} from './excelBase.utils'

export async function buildPOAttainmentExcel(
  data: POAttainmentReportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OBE Attain'
  wb.created = new Date()

  // ── Sheet 1: Department PO Attainment ──────────────────────────────────────
  const s1 = wb.addWorksheet('Department PO Attainment')

  addInstitutionHeader(s1, {
    institution:  data.institution,
    department:   data.department,
    title:        'Department PO Attainment Report',
    academicYear: data.academicYear,
  })

  // PO table — row 7
  const PO_HDRS = ['PO', 'Description', 'Attainment %', 'Target', 'Status']
  const poHdr = s1.getRow(7)
  poHdr.height = 22
  PO_HDRS.forEach((h, i) => { const c = poHdr.getCell(i + 1); c.value = h; applyHeaderStyle(c) })

  let lastRow = 7
  data.poAttainment.forEach((po, idx) => {
    const row   = s1.getRow(8 + idx)
    row.height  = 18
    const level = po.targetMet ? 'met' as const : 'below' as const
    const isAlt = idx % 2 === 1
    ;[po.code, po.description, `${po.attainment}%`, '60%', po.targetMet ? 'Met' : 'Below']
      .forEach((v, j) => {
        const c = row.getCell(j + 1)
        c.value = v
        if (j === 2 || j === 4) applyAttainmentStyle(c, level)
        else applyDataRowStyle(c, isAlt)
      })
    lastRow = 8 + idx
  })

  // Target reference line (dashed border)
  const targetRefRow = s1.getRow(lastRow + 2)
  targetRefRow.getCell(1).value = `Target Threshold: 60%`
  targetRefRow.getCell(1).font  = { color: { argb: `FF${COLORS.teal}` }, bold: true, size: 10, italic: true }
  targetRefRow.getCell(1).border = {
    top:    { style: 'dashed', color: { argb: `FF${COLORS.teal}` } },
    bottom: { style: 'dashed', color: { argb: `FF${COLORS.teal}` } },
  }

  // PSO table
  const psoStart = lastRow + 5
  const PSO_HDRS = ['PSO', 'Description', 'Attainment %', 'Target', 'Status']
  const psoHdr = s1.getRow(psoStart)
  psoHdr.height = 22
  PSO_HDRS.forEach((h, i) => { const c = psoHdr.getCell(i + 1); c.value = h; applyHeaderStyle(c) })

  let lastRow2 = psoStart
  data.psoAttainment.forEach((pso, idx) => {
    const row   = s1.getRow(psoStart + 1 + idx)
    row.height  = 18
    const level = pso.targetMet ? 'met' as const : 'below' as const
    const isAlt = idx % 2 === 1
    ;[pso.code, pso.description, `${pso.attainment}%`, '60%', pso.targetMet ? 'Met' : 'Below']
      .forEach((v, j) => {
        const c = row.getCell(j + 1)
        c.value = v
        if (j === 2 || j === 4) applyAttainmentStyle(c, level)
        else applyDataRowStyle(c, isAlt)
      })
    lastRow2 = psoStart + 1 + idx
  })

  addPageFooter(s1, lastRow2)
  setColumnWidths(s1, [8, 50, 16, 10, 12])

  // ── Sheet 2: Subject-wise Matrix ───────────────────────────────────────────
  const s2 = wb.addWorksheet('Subject-wise Matrix')

  addInstitutionHeader(s2, {
    institution:  data.institution,
    department:   data.department,
    title:        'Subject-wise PO/PSO Attainment Matrix',
    academicYear: data.academicYear,
  })

  // Collect all PO/PSO keys from matrix
  const allKeys = data.subjectMatrix.length > 0
    ? Object.keys(data.subjectMatrix[0]!.poValues)
    : []

  // Header row — row 7
  const mHdr = s2.getRow(7)
  mHdr.height = 22
  mHdr.getCell(1).value = 'Subject'
  applyHeaderStyle(mHdr.getCell(1))
  allKeys.forEach((k, i) => {
    const c = mHdr.getCell(i + 2)
    c.value = k
    applyHeaderStyle(c)
  })

  let lastRow3 = 7
  data.subjectMatrix.forEach((subj, idx) => {
    const row   = s2.getRow(8 + idx)
    row.height  = 18
    const isAlt = idx % 2 === 1
    const c1    = row.getCell(1)
    c1.value    = subj.subjectCode
    applyDataRowStyle(c1, isAlt)

    allKeys.forEach((k, i) => {
      const val  = subj.poValues[k] ?? 0
      const cell = row.getCell(i + 2)
      cell.value = val > 0 ? parseFloat(val.toFixed(2)) : ''
      if (val >= 60) applyAttainmentStyle(cell, 'met')
      else if (val >= 50) applyAttainmentStyle(cell, 'near')
      else if (val > 0)  applyAttainmentStyle(cell, 'below')
      else applyDataRowStyle(cell, isAlt)
      cell.alignment = { horizontal: 'center' }
    })
    lastRow3 = 8 + idx
  })

  // Department average row
  const avgRow = s2.getRow(lastRow3 + 2)
  avgRow.height = 22
  const avgC = avgRow.getCell(1)
  avgC.value = 'Dept Average'
  avgC.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLORS.primary}` } }
  avgC.font  = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 10 }

  allKeys.forEach((k, i) => {
    const vals = data.subjectMatrix.map((s) => s.poValues[k] ?? 0).filter((v) => v > 0)
    const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    const cell = avgRow.getCell(i + 2)
    cell.value = avg > 0 ? parseFloat(avg.toFixed(2)) : ''
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLORS.primary}` } }
    cell.font  = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 10 }
    cell.alignment = { horizontal: 'center' }
  })

  const matCols = [20, ...Array(allKeys.length).fill(9)]
  setColumnWidths(s2, matCols)

  return writeWorkbookBuffer(wb)
}
