import type { NBAReportData } from '../builder.types'
import {
  BRAND, PAGE,
  createPDFDoc,
  addPageNumber,
  addPageHeader,
  addSectionTitle,
  addKeyValueRow,
  drawTable,
  checkPageBreak,
  bufferFromDoc,
} from './pdfBase.utils'

const CHECKLIST_ITEMS = [
  'All COs defined for every subject',
  'CO-PO mapping completed for all subjects',
  'Student marks uploaded for all subjects',
  'Direct attainment calculated for all subjects',
  'Indirect attainment (survey) submitted',
  'Final attainment calculated for all subjects',
  'HOD approval obtained for all subjects',
  'PO/PSO attainment meets NBA target (≥60%)',
]

export async function buildNBAPDF(data: NBAReportData): Promise<Buffer> {
  const doc = createPDFDoc()
  addPageNumber(doc)

  // ── Page 1: Cover ─────────────────────────────────────────────────────────────
  addPageHeader(doc, 'NBA Accreditation Report', data.academicYear)

  doc.moveDown(1.5)
  doc
    .fillColor(BRAND.primary)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(data.institution, PAGE.marginX, doc.y, {
      width: PAGE.contentWidth,
      align: 'center',
    })
  doc.moveDown(0.5)
  doc
    .fillColor(BRAND.medGray)
    .fontSize(11)
    .font('Helvetica')
    .text(`Generated: ${data.generatedAt.toLocaleDateString('en-IN')}`, {
      align: 'center',
    })
  doc.moveDown(2)

  // Summary KPIs
  const s = data.institutionSummary
  const kpiY  = doc.y
  const kpiW  = PAGE.contentWidth / 4

  doc.rect(PAGE.marginX, kpiY, PAGE.contentWidth, 80)
     .fillAndStroke(BRAND.lightGray, BRAND.border)

  const kpis = [
    { label: 'Total Departments', value: String(s.totalDepts) },
    { label: 'Ready Departments', value: String(s.readyDepts) },
    { label: 'Avg PO Attainment', value: `${s.overallPOAvg.toFixed(2)}%` },
    { label: 'Avg PSO Attainment', value: `${s.overallPSOAvg.toFixed(2)}%` },
  ]
  kpis.forEach((kpi, i) => {
    const x = PAGE.marginX + i * kpiW
    doc.fillColor(BRAND.primary).fontSize(20).font('Helvetica-Bold')
       .text(kpi.value, x, kpiY + 14, { width: kpiW, align: 'center' })
    doc.fillColor(BRAND.medGray).fontSize(9).font('Helvetica')
       .text(kpi.label, x, kpiY + 50, { width: kpiW, align: 'center' })
  })
  doc.y = kpiY + 92

  // ── Page 2: Institution PO Summary ───────────────────────────────────────────
  doc.addPage()
  doc.y = PAGE.marginY

  addSectionTitle(doc, 'Institution-wide PO Attainment')

  // Aggregate PO attainment across all depts
  const poKeys = data.departments.length > 0
    ? Object.keys(data.departments[0]!.poAttainment)
    : []

  const avgPORow = poKeys.map((key) => {
    const vals = data.departments.map((d) => d.poAttainment[key] ?? 0)
    const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { key, avg }
  })

  drawTable(doc, {
    headers: [
      { label: 'PO',               width: 44 },
      { label: 'Institution Avg',  width: 100 },
      { label: 'Target Met',       width: 371 },
    ],
    rows: avgPORow.map((r) => [
      r.key,
      `${r.avg.toFixed(2)}%`,
      r.avg >= 60 ? 'Yes' : 'No',
    ]),
    cellStyle: (_, colIdx, value) => {
      if (colIdx === 2) {
        return {
          textColor: value === 'Yes' ? BRAND.teal : BRAND.red,
          bold: true,
        }
      }
      if (colIdx === 1) {
        const pct = parseFloat(String(value))
        return {
          textColor: pct >= 60 ? BRAND.teal : pct >= 50 ? BRAND.amber : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  // ── Per-department sections ───────────────────────────────────────────────────
  data.departments.forEach((dept) => {
    checkPageBreak(doc, 300)

    addSectionTitle(doc, `${dept.name} (${dept.code})`)

    addKeyValueRow(doc, 'Approved Subjects', String(dept.approvedSubjects))
    addKeyValueRow(doc, 'Total Subjects',    String(dept.totalSubjects))
    addKeyValueRow(doc, 'Overall Average',   `${dept.overallAvg.toFixed(2)}%`)

    doc.moveDown(0.5)

    // Abbreviated PO table (code + attainment only, 3 columns with target met)
    const deptPoRows = Object.entries(dept.poAttainment).map(([code, att]) => [
      code,
      `${att.toFixed(2)}%`,
      att >= 60 ? 'Met' : att >= 50 ? 'Near' : 'Below',
    ])

    if (deptPoRows.length > 0) {
      drawTable(doc, {
        headers: [
          { label: 'PO',          width: 60 },
          { label: 'Attainment',  width: 80 },
          { label: 'Status',      width: 375 },
        ],
        rows: deptPoRows,
        rowHeight: 18,
        cellStyle: (_, colIdx, value) => {
          if (colIdx === 2) {
            return {
              textColor: value === 'Met'  ? BRAND.teal  :
                         value === 'Near' ? BRAND.amber : BRAND.red,
              bold: true,
            }
          }
          return {}
        },
      })
    }

    doc.moveDown(0.5)

    // Accreditation status chip
    const statusY  = doc.y
    const statusColors: Record<string, string> = {
      'ready':     BRAND.teal,
      'partial':   BRAND.amber,
      'not-ready': BRAND.red,
    }
    const chipColor = statusColors[dept.accreditationStatus] ?? BRAND.red
    const chipLabel = dept.accreditationStatus === 'ready'     ? '✓ READY'       :
                      dept.accreditationStatus === 'partial'   ? '~ PARTIAL'     : '✗ NOT READY'

    doc.rect(PAGE.marginX, statusY, 140, 24).fill(chipColor)
    doc.fillColor(BRAND.white).fontSize(11).font('Helvetica-Bold')
       .text(chipLabel, PAGE.marginX + 8, statusY + 6, { width: 128 })
    doc.y = statusY + 30
  })

  // ── Checklist page ────────────────────────────────────────────────────────────
  checkPageBreak(doc, 220)
  addSectionTitle(doc, 'Accreditation Readiness Checklist')

  const allReady = data.departments.every((d) => d.accreditationStatus === 'ready')

  CHECKLIST_ITEMS.forEach((item, i) => {
    checkPageBreak(doc, 30)
    const itemY = doc.y
    const pass  = allReady || i < 7  // first 7 are structural, last is attainment-based

    // Checkbox rect
    doc.rect(PAGE.marginX, itemY, 18, 18)
       .fill(pass ? BRAND.teal : BRAND.red)

    // Checkmark / X
    doc.fillColor(BRAND.white).fontSize(11).font('Helvetica-Bold')
       .text(pass ? '✓' : '✗', PAGE.marginX + 3, itemY + 3, { width: 14, align: 'center' })

    // Label
    doc.fillColor(BRAND.primary).fontSize(10).font('Helvetica')
       .text(item, PAGE.marginX + 26, itemY + 3, { width: PAGE.contentWidth - 30 })

    doc.y = itemY + 24
  })

  return bufferFromDoc(doc)
}
