import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const A4_PAGE_WIDTH_MM = 210
const A4_PAGE_HEIGHT_MM = 297
const DEFAULT_MARGIN_MM = 10

const toKebabCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const toInvestmentReportFileName = (propertyTitle: string) => {
  const safeTitle = toKebabCase(propertyTitle || 'property')
  return `${safeTitle}-investment-report.pdf`
}

interface ExportElementToA4PdfOptions {
  element: HTMLElement
  propertyTitle: string
  marginMm?: number
}

export async function exportElementToA4Pdf({ element, propertyTitle, marginMm = DEFAULT_MARGIN_MM }: ExportElementToA4PdfOptions) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const imageData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const printableWidth = A4_PAGE_WIDTH_MM - marginMm * 2
  const printableHeight = A4_PAGE_HEIGHT_MM - marginMm * 2

  const imageWidth = printableWidth
  const imageHeight = (canvas.height * imageWidth) / canvas.width

  let remainingHeight = imageHeight
  let yOffset = marginMm

  pdf.addImage(imageData, 'PNG', marginMm, yOffset, imageWidth, imageHeight, undefined, 'FAST')
  remainingHeight -= printableHeight

  while (remainingHeight > 0) {
    yOffset = marginMm - (imageHeight - remainingHeight)
    pdf.addPage()
    pdf.addImage(imageData, 'PNG', marginMm, yOffset, imageWidth, imageHeight, undefined, 'FAST')
    remainingHeight -= printableHeight
  }

  pdf.save(toInvestmentReportFileName(propertyTitle))
}
