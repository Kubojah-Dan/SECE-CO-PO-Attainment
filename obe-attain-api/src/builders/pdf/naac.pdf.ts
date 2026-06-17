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

export async function buildNAACPDF(data: NBAReportData): Promise<Buffer> {
  const doc = createPDFDoc()
  addPageNumber(doc)

  // ── Cover ─────────────────────────────────────────────────────────────────────
  addPageHeader(doc, 'NAAC Accreditation Report', data.academicYear)

  doc.moveDown(1.5)
  doc.fillColor(BRAND.primary).fontSize(20).font('Helvetica-Bold')
     .text(data.institution, PAGE.marginX, doc.y, { width: PAGE.contentWidth, align: 'center' })
  doc.moveDown(0.5)
  doc.fillColor(BRAND.medGray).fontSize(11).font('Helvetica')
     .text(`Generated: ${data.generatedAt.toLocaleDateString('en-IN')}`, { align: 'center' })
  doc.moveDown(2)

  addKeyValueRow(doc, 'Academic Year',    data.academicYear)
  addKeyValueRow(doc, 'Total Departments', String(data.institutionSummary.totalDepts))
  addKeyValueRow(doc, 'Departments Ready', String(data.institutionSummary.readyDepts))
  addKeyValueRow(doc, 'Avg PO Attainment', `${data.institutionSummary.overallPOAvg.toFixed(2)}%`)
  addKeyValueRow(doc, 'Avg PSO Attainment', `${data.institutionSummary.overallPSOAvg.toFixed(2)}%`)

  // ── Section A: Curriculum Design & Delivery ───────────────────────────────────
  doc.addPage()
  doc.y = PAGE.marginY

  addSectionTitle(doc, 'Section A — Curriculum Design and Delivery (CO-PO Alignment)')

  doc.fillColor(BRAND.primary).fontSize(10).font('Helvetica')
     .text(
       'This section presents the alignment between Course Outcomes (COs) and Program Outcomes (POs), ' +
       'demonstrating the systematic curriculum design and delivery process.',
       PAGE.marginX, doc.y, { width: PAGE.contentWidth }
     )
  doc.moveDown(1)

  // Per-dept CO-PO alignment summary
  data.departments.forEach((dept) => {
    checkPageBreak(doc, 80)
    doc.fillColor(BRAND.secondary).fontSize(11).font('Helvetica-Bold')
       .text(`${dept.name} (${dept.code})`, PAGE.marginX, doc.y)
    doc.moveDown(0.3)

    addKeyValueRow(doc, 'Approved Subjects', String(dept.approvedSubjects), { labelWidth: 160 })
    addKeyValueRow(doc, 'CO-PO Mapping Coverage', `${dept.approvedSubjects}/${dept.totalSubjects} subjects`, { labelWidth: 160 })
    doc.moveDown(0.5)
  })

  // ── Section B: Teaching-Learning Processes ───────────────────────────────────
  checkPageBreak(doc, 160)
  addSectionTitle(doc, 'Section B — Teaching-Learning Processes (CO Attainment)')

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
      { label: 'PO',               width: 50 },
      { label: 'Institution Avg',  width: 120 },
      { label: 'Target (60%)',     width: 80 },
      { label: 'Status',           width: 265 },
    ],
    rows: avgPORow.map((r) => [
      r.key,
      `${r.avg.toFixed(2)}%`,
      '60%',
      r.avg >= 60 ? 'Attained' : r.avg >= 50 ? 'Near Attainment' : 'Not Attained',
    ]),
    cellStyle: (_, colIdx, value) => {
      if (colIdx === 3) {
        return {
          textColor: value === 'Attained'       ? BRAND.teal  :
                     value === 'Near Attainment' ? BRAND.amber : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  // ── Section C: Student Performance ───────────────────────────────────────────
  checkPageBreak(doc, 120)
  addSectionTitle(doc, 'Section C — Student Performance Summary')

  doc.fillColor(BRAND.primary).fontSize(10).font('Helvetica')
     .text(
       'Student performance data is recorded through Internal Assessments (IA), ' +
       'Model Examinations, and End-Semester Examinations (ESE). ' +
       'Detailed student-level reports are available in the CO Attainment module.',
       PAGE.marginX, doc.y, { width: PAGE.contentWidth }
     )
  doc.moveDown(1)

  drawTable(doc, {
    headers: [
      { label: 'Department',          width: 200 },
      { label: 'Subjects Approved',   width: 160 },
      { label: 'Avg Attainment',      width: 155 },
    ],
    rows: data.departments.map((d) => [
      `${d.name} (${d.code})`,
      String(d.approvedSubjects),
      `${d.overallAvg.toFixed(2)}%`,
    ]),
    cellStyle: (_, colIdx, value) => {
      if (colIdx === 2) {
        const pct = parseFloat(String(value))
        return {
          textColor: pct >= 60 ? BRAND.teal : pct >= 50 ? BRAND.amber : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  // ── Section D: Best Practices ─────────────────────────────────────────────────
  checkPageBreak(doc, 120)
  addSectionTitle(doc, 'Section D — Best Practices (PO/PSO Attainment Summary)')

  const metCount = (attainment: Record<string, number>) =>
    Object.values(attainment).filter((v) => v >= 60).length

  drawTable(doc, {
    headers: [
      { label: 'Department',   width: 180 },
      { label: 'POs Met',      width: 90 },
      { label: 'PSOs Met',     width: 90 },
      { label: 'Overall Avg',  width: 90 },
      { label: 'Status',       width: 65 },
    ],
    rows: data.departments.map((d) => [
      d.name,
      String(metCount(d.poAttainment)),
      String(metCount(d.psoAttainment)),
      `${d.overallAvg.toFixed(2)}%`,
      d.accreditationStatus === 'ready'   ? 'Ready'    :
      d.accreditationStatus === 'partial' ? 'Partial'  : 'Not Ready',
    ]),
    cellStyle: (rowIdx, colIdx) => {
      const dept = data.departments[rowIdx]
      if (colIdx === 4 && dept) {
        return {
          textColor: dept.accreditationStatus === 'ready'   ? BRAND.teal  :
                     dept.accreditationStatus === 'partial' ? BRAND.amber : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  return bufferFromDoc(doc)
}
