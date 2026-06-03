import type { ParserPlugin } from '../../plugin.js'
import type { SpecRule, FinanceRule } from '../../keywords.js'
import { parseItalianNumber } from '../../utils.js'

// Brand-specific spec rules — prepended to the generic rule set, so they
// shadow generic rules via "first high-confidence match wins".
const specRules: SpecRule[] = [
  // Renault "Potenza Massima KW CEE (Cv) 80 (160)" — kW first, CV in parens
  { type: 'line', patterns: [/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+\s*\([\d.,]+\)/i],
    field: 'engine_power_cv',
    extract: (_, line) => { const m = line.match(/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+\s*\(([\d.,]+)\)/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },
  { type: 'line', patterns: [/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+/i],
    field: 'engine_power_kw',
    extract: (_, line) => { const m = line.match(/potenza massima\s+kw\s*cee\s*\(cv\)\s*([\d.,]+)/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },
]

// Brand-specific finance rules — prepended to the generic finance rule set.
const financeRules: FinanceRule[] = [
  // Renault: "Prezzo promozionale\n25.924,45 €" (standalone, no qualifier)
  { pattern: /[Pp]rezzo\s+promozionale[^€\d]*([\d.,]+)\s*€/u, field: 'cash_price' },
]

export const renaultPlugin: ParserPlugin = {
  id: 'renault-it',
  displayName: 'Renault',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('renault'))
    add(0.3, /potenza massima kw cee/.test(t))
    add(0.2, t.includes('e-tech'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('renault'))
    add(0.3, t.includes('easy life') || t.includes('renault financial'))
    add(0.2, /configurazione del/.test(t))
    return total > 0 ? score / total : 0
  },

  specRules,
  financeRules,
}
