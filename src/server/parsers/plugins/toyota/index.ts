import type { ParserPlugin } from '../../plugin.js'
import type { SpecRule } from '../../keywords.js'
import { extractFirstNumber } from '../../utils.js'

// Brand-specific spec rules — prepended to the generic rule set, so they
// shadow generic rules via "first high-confidence match wins".
const specRules: SpecRule[] = [
  // Toyota IT configurator: "Percorrenza max in EV (combinato) - WLTP  507 km"
  { type: 'kv',
    keys: ['Percorrenza max in EV WLTP', 'Percorrenza max in EV - WLTP'],
    field: 'ev_range_km',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  // Toyota IT configurator: "Capacità della batteria (kWh)  77 kWh"
  { type: 'kv',
    keys: ['Capacità della batteria'],
    field: 'battery_capacity_kwh',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
]

export const toyotaPlugin: ParserPlugin = {
  id: 'toyota-it',
  displayName: 'Toyota',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('toyota'))
    add(0.3, /configura\s+/.test(t))
    add(0.3, t.includes('financial services toyota') || t.includes('toyota financial'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('toyota'))
    add(0.3, t.includes('toyota easy next') || t.includes('easy next'))
    add(0.3, t.includes('financial services toyota') || t.includes('toyota financial'))
    return total > 0 ? score / total : 0
  },

  specRules,
}
