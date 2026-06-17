/**
 * CO Attainment Excel Builder — 3 sheets
 * Zero Prisma imports. Receives fully-assembled data object.
 */
import ExcelJS from 'exceljs'
import type { COAttainmentReportData } from '../builder.types'
import {
  COLORS,
  applyHeaderStyle,
  applySubHeaderStyle,
  applyDataRowStyle,
  applyAttainmentStyle,
  addInstitutionHeader,
  setColumnWidths,
  addPageFooter,
  freezeHeaderRows,
  writeWorkbookBuffer,
} from './excelBase.utils'

const BLOOMS_MAP: Record<string, string> = {
  L1: 'L1 – Remember',
  L2: 'L2 – Understand',
  L3: 'L3 – Apply',
  L4: 'L4 – Analyse',
  L5: 'L5 – Evaluate',
  L6: 'L6 – Create',
}

export async function buildCOAttainmentExcel(
  data: COAttainmentReportData
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'OBE Attain'
  wb.created = new Date()

  // ── Sheet 1: CO Attainment Summary ─────────────────────────────────────────
  const s1 = wb.addWorksheet('CO Attainment')

  addInstitutionHeader(s1, {
    institution:  data.institution,
    department:   data.department,
    title:        'CO Attainment Report',
    academicYear: data.academicYear,
  })

  // Subject info block — rows 6–9
  const infoRows: [string, string, string, string][] = [
    ['Subject Code:', data.subject.code, 'Subject Name:', data.subject.name],
    ['Semester:',     String(data.subject.semester), 'Type:', data.subject.type],
    ['Regulation:',   data.regulation, 'Faculty:', data.faculty.join(', ')],
    ['Generated:',    data.generatedAt.toLocaleDateString('en-IN'), '', ''],
  ]
  infoRows.forEach(([l1, v1, l2, v2], i) => {
    const row = s1.getRow(6 + i)
    row.height = 18
    row.getCell(1).value = l1; row.getCell(1).font = { bold: true, size: 10 }
    row.getCell(2).value = v1; row.getCell(2).font = { size: 10 }
    row.getCell(3).value = l2; row.getCell(3).font = { bold: true, size: 10 }
    row.getCell(4).value = v2; row.getCell(4).font = { size: 10 }
  })

  // Blank spacer row 10
  s1.getRow(10).height = 6

  // CO Attainment Table — starts row 11
  const HEADERS_1 = [
    'CO No.', 'Description', "Bloom's", 'Target %',
    'IA Att.%', 'ESE Att.%', 'Direct%', 'Indirect%', 'Final%', 'Status',
  ]
  const headerRow1 = s1.getRow(11)
  headerRow1.height = 22
  HEADERS_1.forEach((h, i) => {
    const cell = headerRow1.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  let lastRow1 = 11
  data.cos.forEach((co, idx) => {
    const row = s1.getRow(12 + idx)
    row.height = 20
    const isAlt = idx % 2 === 1
    const values = [
      `CO${co.number}`,
      co.description,
      BLOOMS_MAP[co.bloomsLevel] ?? co.bloomsLevel,
      co.targetPercent,
      co.iaAttainment,
      co.eseAttainment,
      co.directValue,
      co.indirectValue,
      co.finalValue,
      co.attainmentLevel === 'met' ? 'Met' : co.attainmentLevel === 'near' ? 'Near' : 'Below',
    ]
    values.forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.value = v as ExcelJS.CellValue
      if (j === 8 || j === 9) {
        applyAttainmentStyle(cell, co.attainmentLevel)
      } else {
        applyDataRowStyle(cell, isAlt)
        if (j >= 4 && j <= 8) {
          cell.numFmt = '0.00'
          cell.alignment = { horizontal: 'center' }
        }
      }
    })
    // Wrap description
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    lastRow1 = 12 + idx
  })

  // Summary row
  const sumRow = s1.getRow(lastRow1 + 2)
  sumRow.height = 22
  const coCount = data.cos.length
  const avg = (key: keyof typeof data.cos[0]) =>
    coCount > 0
      ? data.cos.reduce((a, c) => a + (c[key] as number), 0) / coCount
      : 0

  const sumValues = [
    'Average', '—', '—', '—',
    avg('iaAttainment').toFixed(2),
    avg('eseAttainment').toFixed(2),
    avg('directValue').toFixed(2),
    avg('indirectValue').toFixed(2),
    avg('finalValue').toFixed(2),
    `${data.summary.cosMeetingTarget}/${data.summary.totalCOs} Met`,
  ]
  sumValues.forEach((v, i) => {
    const cell = sumRow.getCell(i + 1)
    cell.value = v
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLORS.primary}` } }
    cell.font = { color: { argb: `FF${COLORS.white}` }, bold: true, size: 10 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  setColumnWidths(s1, [8, 40, 18, 10, 12, 12, 10, 10, 10, 10])
  freezeHeaderRows(s1, 11)

  // ── Sheet 2: CO-PO Mapping Matrix ──────────────────────────────────────────
  const s2 = wb.addWorksheet('CO-PO Mapping')

  addInstitutionHeader(s2, {
    institution:  data.institution,
    department:   data.department,
    title:        'CO-PO Mapping Matrix',
    academicYear: data.academicYear,
  })

  // Collect all POs and PSOs from mapping data
  const poKeys  = [...new Set(data.mapping.flatMap((m) => Object.keys(m.poMappings)))]
  const psoKeys = [...new Set(data.mapping.flatMap((m) => Object.keys(m.psoMappings)))]

  // Row 6: blank spacer, Row 7: headers (PO1, PO2... PSO1, PSO2...)
  const matrixHeaderRow = s2.getRow(7)
  matrixHeaderRow.height = 22
  matrixHeaderRow.getCell(1).value = 'CO'
  applyHeaderStyle(matrixHeaderRow.getCell(1))

  const allOutcomes = [...poKeys, ...psoKeys]
  allOutcomes.forEach((code, i) => {
    const cell = matrixHeaderRow.getCell(i + 2)
    cell.value = code
    applyHeaderStyle(cell)
  })

  // Row 8: descriptions (truncated to 20 chars) — kept brief for PO codes
  const descRow = s2.getRow(8)
  descRow.height = 30
  allOutcomes.forEach((code, i) => {
    const cell = descRow.getCell(i + 2)
    const found = data.poAttainment.find((p) => p.code === code) ??
                  data.psoAttainment.find((p) => p.code === code)
    cell.value = found ? found.description.substring(0, 20) : code
    applySubHeaderStyle(cell)
  })

  // Mapping level fill colors
  const levelFill = (level: number): string => {
    if (level === 0) return COLORS.white
    if (level === 1) return 'E8EAF2'
    if (level === 2) return 'A5ADD9'
    return '252D72'
  }

  let lastRow2 = 8
  data.mapping.forEach((m, idx) => {
    const row = s2.getRow(9 + idx)
    row.height = 18
    const coCell = row.getCell(1)
    coCell.value = `CO${m.coNumber}`
    coCell.font  = { bold: true, size: 10 }
    coCell.alignment = { horizontal: 'center', vertical: 'middle' }

    allOutcomes.forEach((code, i) => {
      const level = m.poMappings[code] ?? m.psoMappings[code] ?? 0
      const cell  = row.getCell(i + 2)
      cell.value  = level > 0 ? level : ''
      cell.fill   = { type: 'pattern', pattern: 'solid',
                      fgColor: { argb: `FF${levelFill(level)}` } }
      cell.font   = { color: { argb: level === 3 ? `FF${COLORS.white}` : `FF${COLORS.primary}` },
                      bold: level >= 2, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    lastRow2 = 9 + idx
  })

  // Average row
  const avgRow2 = s2.getRow(lastRow2 + 2)
  avgRow2.height = 20
  avgRow2.getCell(1).value = 'Avg'
  avgRow2.getCell(1).font  = { bold: true, size: 10 }
  allOutcomes.forEach((code, i) => {
    const vals = data.mapping.map(
      (m) => m.poMappings[code] ?? m.psoMappings[code] ?? 0
    )
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    const cell = avgRow2.getCell(i + 2)
    cell.value = avg > 0 ? parseFloat(avg.toFixed(2)) : ''
    cell.font  = { bold: true, size: 10 }
    cell.alignment = { horizontal: 'center' }
    cell.border = { top: { style: 'double', color: { argb: `FF${COLORS.primary}` } } }
  })

  const matrixCols = [8, ...Array(allOutcomes.length).fill(8)]
  setColumnWidths(s2, matrixCols)

  // ── Sheet 3: PO/PSO Attainment ──────────────────────────────────────────────
  const s3 = wb.addWorksheet('PO-PSO Attainment')

  addInstitutionHeader(s3, {
    institution:  data.institution,
    department:   data.department,
    title:        'PO & PSO Attainment',
    academicYear: data.academicYear,
  })

  // PO table header — row 7
  const PO_HEADERS = ['PO', 'Description', 'Attainment %', 'Target %', 'Status']
  const poHeaderRow = s3.getRow(7)
  poHeaderRow.height = 22
  PO_HEADERS.forEach((h, i) => {
    const cell = poHeaderRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  let lastRow3 = 7
  data.poAttainment.forEach((po, idx) => {
    const row = s3.getRow(8 + idx)
    row.height = 18
    const level: 'met' | 'near' | 'below' = po.targetMet ? 'met' : 'below'
    const isAlt = idx % 2 === 1
    ;[po.code, po.description, `${po.attainment}%`, '60%',
      po.targetMet ? 'Met' : 'Below'
    ].forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.value = v
      if (j === 2 || j === 4) applyAttainmentStyle(cell, level)
      else applyDataRowStyle(cell, isAlt)
    })
    lastRow3 = 8 + idx
  })

  // Gap + PSO table
  const psoStart = lastRow3 + 3
  const psoHeaderRow = s3.getRow(psoStart)
  psoHeaderRow.height = 22
  PO_HEADERS.map((h) => h.replace('PO', 'PSO')).forEach((h, i) => {
    const cell = psoHeaderRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  let lastRow3b = psoStart
  data.psoAttainment.forEach((pso, idx) => {
    const row = s3.getRow(psoStart + 1 + idx)
    row.height = 18
    const level: 'met' | 'near' | 'below' = pso.targetMet ? 'met' : 'below'
    const isAlt = idx % 2 === 1
    ;[pso.code, pso.description, `${pso.attainment}%`, '60%',
      pso.targetMet ? 'Met' : 'Below'
    ].forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.value = v
      if (j === 2 || j === 4) applyAttainmentStyle(cell, level)
      else applyDataRowStyle(cell, isAlt)
    })
    lastRow3b = psoStart + 1 + idx
  })

  addPageFooter(s3, lastRow3b)
  setColumnWidths(s3, [8, 50, 16, 12, 12])

  return writeWorkbookBuffer(wb)
}
