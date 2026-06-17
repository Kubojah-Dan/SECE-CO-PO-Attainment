import PDFDocument from 'pdfkit'

// ─── Brand palette ────────────────────────────────────────────────────────────
export const BRAND = {
  primary:   '#1A1F4E',
  secondary: '#4A52A3',
  teal:      '#0D6E5A',
  amber:     '#B7760A',
  red:       '#E24B4A',
  lightGray: '#F4F5F8',
  medGray:   '#9398B0',
  border:    '#E8EAF2',
  white:     '#FFFFFF',
}

// ─── Page constants ───────────────────────────────────────────────────────────
export const PAGE = {
  width:        595,
  height:       842,
  marginX:      40,
  marginY:      40,
  contentWidth: 515,
}

// ─── Document factory ─────────────────────────────────────────────────────────
export function createPDFDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({
    size:    'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info:    { Title: 'OBE Attain Report', Author: 'OBE Attain' },
    bufferPages: true,
  })
}

// ─── Page number tracker ──────────────────────────────────────────────────────
export function addPageNumber(doc: InstanceType<typeof PDFDocument>): void {
  doc.on('pageAdded', () => {
    // written at bufferFromDoc time after all pages are known
  })
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function addPageHeader(
  doc:       InstanceType<typeof PDFDocument>,
  title:     string,
  subtitle?: string
): void {
  // Dark indigo banner
  doc
    .rect(PAGE.marginX, doc.y, PAGE.contentWidth, 50)
    .fill(BRAND.primary)

  const bannerY = doc.y

  doc
    .fillColor(BRAND.white)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title, PAGE.marginX + 10, bannerY + 10, {
      width: PAGE.contentWidth - 20,
      align: 'left',
    })

  if (subtitle) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(subtitle, PAGE.marginX + 10, bannerY + 30, {
        width: PAGE.contentWidth - 20,
        align: 'right',
      })
  }

  // Teal accent line below banner
  doc
    .moveTo(PAGE.marginX, bannerY + 52)
    .lineTo(PAGE.marginX + PAGE.contentWidth, bannerY + 52)
    .lineWidth(2)
    .stroke(BRAND.teal)

  doc.y = bannerY + 66
}

// ─── Section title ────────────────────────────────────────────────────────────
export function addSectionTitle(doc: InstanceType<typeof PDFDocument>, text: string): void {
  checkPageBreak(doc, 34)

  doc
    .rect(PAGE.marginX, doc.y, PAGE.contentWidth, 24)
    .fill(BRAND.secondary)

  const sectionY = doc.y

  doc
    .fillColor(BRAND.white)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(text, PAGE.marginX + 8, sectionY + 6, {
      width: PAGE.contentWidth - 16,
    })

  doc.y = sectionY + 30
}

// ─── Key-value row ────────────────────────────────────────────────────────────
export function addKeyValueRow(
  doc:   InstanceType<typeof PDFDocument>,
  label: string,
  value: string,
  opts?: { labelWidth?: number }
): void {
  const labelW = opts?.labelWidth ?? 140
  const y      = doc.y

  doc
    .fillColor(BRAND.medGray)
    .fontSize(9)
    .font('Helvetica')
    .text(label + ':', PAGE.marginX, y, { width: labelW, continued: false })

  doc
    .fillColor(BRAND.primary)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(value, PAGE.marginX + labelW, y, {
      width: PAGE.contentWidth - labelW,
    })

  doc.y = y + 16
}

// ─── Table renderer ───────────────────────────────────────────────────────────

export interface TableColumn {
  label:  string
  width:  number
  align?: 'left' | 'center' | 'right'
}

export type CellStyleFn = (
  rowIdx: number,
  colIdx: number,
  value:  string | number
) => { textColor?: string; bgColor?: string; bold?: boolean }

export interface DrawTableOptions {
  headers:   TableColumn[]
  rows:      (string | number)[][]
  rowHeight?: number
  headerBg?:  string
  altRowBg?:  string
  cellStyle?: CellStyleFn
}

export function drawTable(
  doc:  InstanceType<typeof PDFDocument>,
  opts: DrawTableOptions
): void {
  const { headers, rows } = opts
  const rowHeight  = opts.rowHeight  ?? 20
  const headerBg   = opts.headerBg   ?? BRAND.primary
  const altRowBg   = opts.altRowBg   ?? BRAND.lightGray

  const startX = PAGE.marginX

  // ── Draw header ─────────────────────────────────────────────────────────────
  const drawHeader = (y: number) => {
    let x = startX
    const totalW = headers.reduce((a, h) => a + h.width, 0)

    doc.rect(startX, y, totalW, rowHeight).fill(headerBg)

    headers.forEach((h) => {
      doc
        .fillColor(BRAND.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(h.label, x + 4, y + 5, {
          width:  h.width - 8,
          align:  h.align ?? 'left',
          height: rowHeight - 4,
          ellipsis: true,
          lineBreak: false,
        })
      x += h.width
    })
    return y + rowHeight
  }

  let currentY = drawHeader(doc.y)
  doc.y = currentY

  // ── Draw data rows ──────────────────────────────────────────────────────────
  rows.forEach((row, rowIdx) => {
    // Page break check
    if (doc.y + rowHeight > PAGE.height - PAGE.marginY) {
      doc.addPage()
      doc.y = PAGE.marginY
      currentY = drawHeader(doc.y)
      doc.y = currentY
    }

    const y      = doc.y
    const isAlt  = rowIdx % 2 === 1
    const totalW = headers.reduce((a, h) => a + h.width, 0)

    // Alt background
    if (isAlt) {
      doc.rect(startX, y, totalW, rowHeight).fill(altRowBg)
    }

    let x = startX
    row.forEach((value, colIdx) => {
      const style    = opts.cellStyle?.(rowIdx, colIdx, value) ?? {}
      const textColor = style.textColor ?? BRAND.primary
      const bold      = style.bold ?? false
      const colWidth  = headers[colIdx]?.width ?? 60

      // Per-cell background override
      if (style.bgColor) {
        doc.rect(x, y, colWidth, rowHeight).fill(style.bgColor)
      }

      doc
        .fillColor(textColor)
        .fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(String(value ?? ''), x + 4, y + 5, {
          width:     colWidth - 8,
          align:     headers[colIdx]?.align ?? 'left',
          height:    rowHeight - 4,
          ellipsis:  true,
          lineBreak: false,
        })

      x += colWidth
    })

    // Bottom border line
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + totalW, y + rowHeight)
      .lineWidth(0.5)
      .stroke(BRAND.border)

    doc.y = y + rowHeight
  })
}

// ─── Page break guard ─────────────────────────────────────────────────────────
export function checkPageBreak(doc: InstanceType<typeof PDFDocument>, neededHeight: number): void {
  if (doc.y + neededHeight > PAGE.height - PAGE.marginY) {
    doc.addPage()
    doc.y = PAGE.marginY
  }
}

// ─── Buffer collector ─────────────────────────────────────────────────────────
export function bufferFromDoc(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Stamp page numbers now that all pages exist
    const range = doc.bufferedPageRange()
    const total = range.count

    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i)
      doc
        .fillColor(BRAND.medGray)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Page ${i + 1} of ${total}`,
          PAGE.marginX,
          PAGE.height - PAGE.marginY + 10,
          { align: 'center', width: PAGE.contentWidth }
        )
    }

    const chunks: Buffer[] = []
    doc.on('data',  (chunk: Buffer) => chunks.push(chunk))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

