import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker once at module load
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(reconstructLines(content.items))
  }

  return pages.join('\n')
}

/** Subset of pdfjs' TextItem we rely on (text + position matrix). */
interface PositionedItem {
  str: string
  transform: number[]
}

/**
 * pdfjs returns text as positioned fragments with no line structure. Joining
 * them all with spaces collapses an entire page into one line, which destroys
 * the `key  value` row layout the spec/finance parsers rely on. Instead we
 * group fragments into rows by their vertical position (`transform[5]`) and
 * order each row left-to-right by horizontal position (`transform[4]`), so a
 * configurator spec table comes out one field per line — structurally the same
 * as text copy-pasted from the page.
 */
function reconstructLines(items: ReadonlyArray<unknown>): string {
  // Vertical tolerance (PDF units): fragments within this Y delta share a row.
  // Configurator rows are ~14 units apart, so a small threshold is safe.
  const Y_TOLERANCE = 3

  const rows: { y: number; frags: { x: number; str: string }[] }[] = []
  for (const item of items) {
    if (!isPositioned(item) || item.str === '') continue
    const x = item.transform[4]
    const y = item.transform[5]
    const row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE)
    if (row) row.frags.push({ x, str: item.str })
    else rows.push({ y, frags: [{ x, str: item.str }] })
  }

  return rows
    .map((r) =>
      r.frags
        .sort((a, b) => a.x - b.x)
        .map((f) => f.str)
        .join(' ')
        .replace(/ +/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

function isPositioned(item: unknown): item is PositionedItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    typeof (item as PositionedItem).str === 'string' &&
    Array.isArray((item as PositionedItem).transform)
  )
}
