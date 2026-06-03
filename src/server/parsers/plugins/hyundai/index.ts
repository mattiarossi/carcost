import type { ParserPlugin } from '../../plugin.js'
import type { SpecRule } from '../../keywords.js'
import { extractFirstNumber, parseItalianNumber } from '../../utils.js'

// Brand-specific spec rules — prepended to the generic rule set, so they
// shadow generic rules via "first high-confidence match wins".
const specRules: SpecRule[] = [
  // Hyundai configurator raw API labels:
  // "phev Combined Output Kw - phev Combined Output Hp Label  211,8 / 288"
  { type: 'kv',
    keys: ['phev Combined Output Kw phev Combined Output Hp Label',
           'phev MaxPower Kw phev MaxPower Hp Label'],
    field: 'engine_power_kw',
    // handles "211,8 / 288" (kW / CV) — take the first number
    extract: (v) => { const m = v.match(/([\d.,]+)\s*(?:kW|\/)/i); return m ? parseItalianNumber(m[1]) : extractFirstNumber(v) },
    confidence: 'high' },
  // Hyundai German + Italian configurator electric-range labels:
  // "max. elektrische Reichweite (City) bei voller Batterie (km) nach WLTP  89"
  { type: 'kv',
    keys: ['elektrische Reichweite City voller Batterie WLTP', 'elektrische Reichweite WLTP',
           'max elektrische Reichweite City voller Batterie km nach WLTP',
           'max. elektrische Reichweite (City) bei voller Batterie (km) nach WLTP',
           'autonomia elettrica WLTP City', 'max electric range city full battery',
           'Autonomia elettrica WLTP (km)', 'autonomia solo elettrica WLTP'],
    field: 'ev_range_km',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
]

export const hyundaiPlugin: ParserPlugin = {
  id: 'hyundai-it',
  displayName: 'Hyundai',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('hyundai'))
    add(0.4, /phev.*maxpower/.test(t) || /elektrische reichweite/.test(t))
    add(0.2, t.includes('bluelink'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.5, t.includes('hyundai'))
    add(0.3, /hyundai\s+financial/.test(t))
    add(0.2, t.includes('bluelink') || /la tua hyundai/.test(t))
    return total > 0 ? score / total : 0
  },

  specRules,
}
