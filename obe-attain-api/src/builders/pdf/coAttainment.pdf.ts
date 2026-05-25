/**
 * CO Attainment PDF Builder
 * Zero Prisma imports. Receives fully-assembled data object.
 */
import type { COAttainmentReportData } from '../builder.types'
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

export async function buildCOAttainmentPDF(
  data: COAttainmentReportData
): Promise<Buffer> {
  const doc = createPDFDoc()
  addPageNumber(doc)

  // ── Page 1: Cover / Subject Info ─────────────────────────────────────────────
  addPageHeader(doc, 'CO Attainment Report', `${data.department} | ${data.academicYear}`)

  doc.moveDown(0.5)
  addKeyValueRow(doc, 'Subject Code',  data.subject.code)
  addKeyValueRow(doc, 'Subject Name',  data.subject.name)
  addKeyValueRow(doc, 'Semester',      `${data.subject.semester}`)
  addKeyValueRow(doc, 'Subject Type',  data.subject.type)
  addKeyValueRow(doc, 'Regulation',    data.regulation)
  addKeyValueRow(doc, 'Faculty',       data.faculty.join(', '))
  addKeyValueRow(doc, 'Institution',   data.institution)
  addKeyValueRow(doc, 'Generated',     data.generatedAt.toLocaleDateString('en-IN'))

  doc.moveDown(1)

  // ── Summary KPI box ─────────────────────────────────────────────────────────
  const boxY = doc.y
  const boxH = 80
  const kpiW = PAGE.contentWidth / 4

  doc.rect(PAGE.marginX, boxY, PAGE.contentWidth, boxH)
     .fillAndStroke(BRAND.lightGray, BRAND.border)

  const kpis = [
    { label: 'Overall Direct',    value: `${data.summary.overallDirect}%` },
    { label: 'Indirect',          value: `${data.summary.overallIndirect}%` },
    { label: 'Final Attainment',  value: `${data.summary.overallFinal}%` },
    { label: 'COs Met',           value: `${data.summary.cosMeetingTarget}/${data.summary.totalCOs}` },
  ]

  kpis.forEach((kpi, i) => {
    const kpiX = PAGE.marginX + i * kpiW

    doc
      .fillColor(BRAND.primary)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(kpi.value, kpiX, boxY + 14, {
        width: kpiW,
        align: 'center',
      })

    doc
      .fillColor(BRAND.medGray)
      .fontSize(9)
      .font('Helvetica')
      .text(kpi.label, kpiX, boxY + 48, {
        width: kpiW,
        align: 'center',
      })
  })

  doc.y = boxY + boxH + 12

  // ── Page 2: CO Attainment Table ─────────────────────────────────────────────
  doc.addPage()
  doc.y = PAGE.marginY

  addSectionTitle(doc, 'Course Outcome Attainment')

  drawTable(doc, {
    headers: [
      { label: 'CO',          width: 34 },
      { label: 'Description', width: 156 },
      { label: "Bloom's",     width: 60 },
      { label: 'Target',      width: 42 },
      { label: 'Direct',      width: 44 },
      { label: 'Indirect',    width: 44 },
      { label: 'Final',       width: 44 },
      { label: 'Status',      width: 51 },
    ],
    rows: data.cos.map((co) => [
      `CO${co.number}`,
      co.description,
      co.bloomsLevel,
      `${co.targetPercent}%`,
      `${co.directValue}%`,
      `${co.indirectValue}%`,
      `${co.finalValue}%`,
      co.attainmentLevel === 'met'  ? 'Met'  :
      co.attainmentLevel === 'near' ? 'Near' : 'Below',
    ]),
    cellStyle: (rowIdx, colIdx) => {
      const level = data.cos[rowIdx]?.attainmentLevel
      if (colIdx === 7) {
        return {
          textColor: level === 'met'  ? BRAND.teal  :
                     level === 'near' ? BRAND.amber : BRAND.red,
          bold: true,
        }
      }
      if (colIdx === 6) {
        return {
          bold: true,
          textColor: level === 'met'  ? BRAND.teal  :
                     level === 'near' ? BRAND.amber : BRAND.red,
        }
      }
      return {}
    },
  })

  doc.moveDown(1)

  // ── PO Attainment ────────────────────────────────────────────────────────────
  checkPageBreak(doc, 200)
  addSectionTitle(doc, 'Program Outcome Attainment')

  drawTable(doc, {
    headers: [
      { label: 'PO',           width: 44 },
      { label: 'Description',  width: 315 },
      { label: 'Attainment %', width: 82 },
      { label: 'Status',       width: 74 },
    ],
    rows: data.poAttainment.map((po) => [
      po.code,
      po.description,
      `${po.attainment}%`,
      po.targetMet ? 'Met' : 'Below',
    ]),
    cellStyle: (_, colIdx, value) => {
      if (colIdx === 3) {
        return {
          textColor: value === 'Met' ? BRAND.teal : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  doc.moveDown(1)

  // ── PSO Attainment ───────────────────────────────────────────────────────────
  checkPageBreak(doc, 120)
  addSectionTitle(doc, 'Program Specific Outcome Attainment')

  drawTable(doc, {
    headers: [
      { label: 'PSO',          width: 44 },
      { label: 'Description',  width: 315 },
      { label: 'Attainment %', width: 82 },
      { label: 'Status',       width: 74 },
    ],
    rows: data.psoAttainment.map((pso) => [
      pso.code,
      pso.description,
      `${pso.attainment}%`,
      pso.targetMet ? 'Met' : 'Below',
    ]),
    cellStyle: (_, colIdx, value) => {
      if (colIdx === 3) {
        return {
          textColor: value === 'Met' ? BRAND.teal : BRAND.red,
          bold: true,
        }
      }
      return {}
    },
  })

  return bufferFromDoc(doc)
}
