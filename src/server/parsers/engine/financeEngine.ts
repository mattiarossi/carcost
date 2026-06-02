import type { ParsedFinance } from '../types.js'
import type { FinanceRule } from '../keywords.js'
import { normaliseText, parseItalianNumber } from '../utils.js'

/**
 * Pure finance engine. Takes raw pasted text and a rules array.
 * Returns a ParsedFinance object.
 */
export function financeEngine(rawText: string, rules: FinanceRule[]): ParsedFinance {
  let text = normaliseText(rawText)
  // Join label line + next line when next line is purely a currency amount
  text = text.replace(/([^\n]{2,60})\n(€\s*[\d.,]+)/g, '$1 $2')
  // Join label line + next line when next line is a bare percentage
  text = text.replace(/([^\n]{2,60})\n([\d.,]+\s*%)/g, '$1 $2')
  // Normalise "€ 1.234,56" → "1.234,56 €"
  text = text.replace(/€\s*(\d[\d.,]*)/g, '$1 €')

  const result: Partial<Omit<ParsedFinance, 'raw_text' | 'raw_extras' | 'confidence'>> = {}
  const confidence: ParsedFinance['confidence'] = {}
  const raw_extras: Record<string, string> = {}

  for (const rule of rules) {
    const m = text.match(rule.pattern)
    if (!m) continue

    if (Array.isArray(rule.field)) {
      const [fieldA, fieldB] = rule.field
      if (m[1] && result[fieldA] === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result as any)[fieldA] = parseItalianNumber(m[1])
        confidence[fieldA] = 'high'
      }
      if (m[2] && result[fieldB] === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result as any)[fieldB] = parseItalianNumber(m[2])
        confidence[fieldB] = 'high'
      }
    } else {
      const field = rule.field as keyof typeof result
      if (result[field] === undefined && m[1]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result as any)[field] = parseItalianNumber(m[1])
        confidence[field] = 'high'
      }
    }
  }

  if (!result.label) {
    const headingMatch = text.match(/^([A-ZÀÈÉÌÒÙ][^\n]{3,60})\n/m)
    if (headingMatch) {
      result.label = headingMatch[1].trim()
    }
  }

  const lines = text.split('\n')
  for (const line of lines) {
    const kv = line.match(/^(.{3,50})\s*[:\-–]\s*([\d.,€%\s]+)$/)
    if (kv) {
      const key = kv[1].trim()
      const val = kv[2].trim()
      const alreadyCaptured = Object.values(result).some((v) => {
        if (typeof v !== 'number') return false
        return Math.abs(v - parseItalianNumber(val)) < 0.01
      })
      if (!alreadyCaptured) {
        raw_extras[key] = val
      }
    }
  }

  return {
    ...result,
    raw_text: rawText,
    raw_extras,
    confidence,
  } as ParsedFinance
}
