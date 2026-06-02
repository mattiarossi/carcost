/**
 * Converts Italian-formatted numbers to JS numbers.
 * "12.345,67" → 12345.67   |   "1.234" → 1234   |   "12,5" → 12.5
 */
export function parseItalianNumber(s: string): number {
  const cleaned = s.trim()
  // Pattern: has dot thousands + comma decimal → strip dots, replace comma
  if (/\d\.\d{3},\d/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  // Comma only (decimal comma without thousands separator)
  if (/^\d+,\d+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'))
  }
  // Dot as thousands only (no decimal comma, e.g. "12.345")
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, ''))
  }
  return parseFloat(cleaned.replace(',', '.'))
}

/**
 * Attempts to split a raw line into {key, value} on common delimiters.
 * Returns null if the line looks like a pure value or heading.
 */
export function splitKeyValue(line: string): { key: string; value: string } | null {
  // Try tab first (most reliable in copy-paste from structured tables)
  const tabIdx = line.indexOf('\t')
  if (tabIdx > 0) {
    return { key: line.slice(0, tabIdx).trim(), value: line.slice(tabIdx + 1).trim() }
  }
  // " : " or ": " with at least one word on each side
  const colonMatch = line.match(/^(.+?)\s*:\s*(.+)$/)
  if (colonMatch) {
    return { key: colonMatch[1].trim(), value: colonMatch[2].trim() }
  }
  // " - " with at least one word on each side (e.g. "Autonomia - 450 km")
  const dashMatch = line.match(/^(.+?)\s{1,3}-\s{1,3}(.+)$/)
  if (dashMatch) {
    return { key: dashMatch[1].trim(), value: dashMatch[2].trim() }
  }
  // Trailing number: "Label (unit) 6" or "Label 89" — Hyundai / German maker format
  // Key must be ≥5 chars and contain a letter; value is trailing numeric token(s)
  const trailingNum = line.match(/^(.{5,})\s+([-+][\d.,]+|[\d.,]+(?:\s*\/\s*[\d.,]+)?)\s*$/)
  if (trailingNum && /[a-zA-Z]/.test(trailingNum[1])) {
    return { key: trailingNum[1].trim(), value: trailingNum[2].trim() }
  }
  return null
}

/**
 * Normalises whitespace and common Unicode punctuation.
 * Also repairs PDF copy-paste artifacts like "T otale" → "Totale".
 */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '\t')               // keep tabs — used as delimiters
    .replace(/[ \u00A0\u202F]+/g, ' ')  // collapse non-breaking + multiple spaces → single space
    // Repair PDF word-split artifacts: single capital letter + space + rest of word
    // e.g. "T otale" → "Totale", "WL TP" → "WLTP"
    .replace(/\b([A-Z])\s+([a-z]{2,})\b/g, '$1$2')
    .replace(/\b([A-Z]{2,})\s+([A-Z]{2,})\b/g, '$1$2')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .trim()
}

/**
 * Normalises a KV key for fuzzy matching:
 * - strips parenthetical content (units, notes) e.g. "(L/100 Km)", "(kWh)", "(Cv)"
 * - strips bracket content e.g. "[WLTP]"
 * - collapses resulting multiple spaces
 */
export function normaliseKey(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)/g, '')   // remove (…) groups
    .replace(/\s*\[[^\]]*\]/g, '')   // remove […] groups
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extracts the first number found in a string (ignoring units).
 */
export function extractFirstNumber(s: string): number | undefined {
  const m = s.match(/([\d.,]+)/)
  if (!m) return undefined
  return parseItalianNumber(m[1])
}
