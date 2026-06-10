import type { ParserPlugin } from '../../plugin.js'
import type { SpecRule, FinanceRule } from '../../keywords.js'
import { parseItalianNumber, extractFirstNumber } from '../../utils.js'

// Positional performance row shared by every CUPRA configurator:
//   Terramar: "205 km/h 204 CV 350 / 850 - 4.000 Nm/RPM"
//   Raval:    "160 km/h 211 CV 290 (5.104) Nm/RPM"
// → top speed, power (CV), peak torque (first integer after CV).
const TABLE_ROW = /^(\d+)\s*km\/h\s+(\d+)\s*CV\s+(\d+)/i

// ─── Spec rules ────────────────────────────────────────────────────────────────
//
// CUPRA (SEAT/VW-group) configurator quirks the generic rules don't cover, and
// which differ between the PHEV (Terramar) and BEV (Raval) outputs:
//  • Power may be inline in the variant name ("150 kW (204 CV)") or only in the
//    positional table row ("211 CV", no kW) — covered by TABLE_ROW.
//  • The emissions block lists every WLTP sub-cycle plus combined, under labels
//    that vary by model ("…ciclo di prova combinato (Elettrico)" vs "Consumo
//    elettrico ciclo combinato"). `preprocessSpecs` collapses the combined
//    petrol / electric / range rows to unique keys and drops the rest.
//  • A pure-electric configurator carries no "BEV"/"100% elettrico" marker, so
//    `preprocessSpecs` infers it from the absence of combustion wording.
//
// Prepended to the generic rule set, so they shadow generic rules via
// "first high-confidence match wins".
const specRules: SpecRule[] = [
  // Variant name power: "Tribe Edition 1.5 Ibrida Plug-in 150 kW (204 CV)".
  { type: 'line', patterns: [/\b\d+\s*kW\s*\(\s*\d+\s*CV\s*\)/i],
    field: 'engine_power_kw',
    extract: (_, line) => { const m = line.match(/\b(\d+)\s*kW\s*\(\s*\d+\s*CV\s*\)/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },

  // Trim at the head of the variant line: "Tribe Edition…", "Launch Edition Plus".
  { type: 'line', patterns: [/^(?:[A-Z][a-zA-Z]+\s+)?Edition\b/],
    field: 'trim',
    extract: (_, line) => { const m = line.match(/^((?:[A-Z][a-zA-Z]+\s+)?Edition(?:\s+[A-Z][a-zA-Z]+)?)\b/); return m ? m[1].trim() : undefined },
    confidence: 'low' },

  // DSG dual-clutch gearbox → automatic (generic rules don't know "DSG").
  { type: 'line', patterns: [/\bDSG\b/],
    field: 'transmission', extract: () => 'automatic', confidence: 'high' },

  // Positional performance row → speed / power (CV) / torque.
  { type: 'line', patterns: [TABLE_ROW], field: 'top_speed_kmh',
    extract: (_, line) => { const m = line.match(TABLE_ROW); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },
  { type: 'line', patterns: [TABLE_ROW], field: 'engine_power_cv',
    extract: (_, line) => { const m = line.match(TABLE_ROW); return m ? parseItalianNumber(m[2]) : undefined },
    confidence: 'high' },
  { type: 'line', patterns: [TABLE_ROW], field: 'torque_nm',
    extract: (_, line) => { const m = line.match(TABLE_ROW); return m ? parseItalianNumber(m[3]) : undefined },
    confidence: 'high' },

  // Charging: "…AC 2:30 h" (Terramar) / "…AC 5h 30m h" (Raval); "…DC 26 min".
  { type: 'line', patterns: [/tempo di ricarica AC\s+\d+\s*[:h]\s*\d+/i],
    field: 'charge_time_ac_h',
    extract: (_, line) => { const m = line.match(/tempo di ricarica AC\s+(\d+)\s*[:h]\s*(\d+)/i); return m ? parseItalianNumber(m[1]) + parseItalianNumber(m[2]) / 60 : undefined },
    confidence: 'high' },
  { type: 'line', patterns: [/tempo di ricarica DC\s+\d+\s*min/i],
    field: 'charge_time_10_80_min',
    extract: (_, line) => { const m = line.match(/tempo di ricarica DC\s+(\d+)\s*min/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },

  // Canonical consumption / range rows produced by preprocessSpecs. Synthetic
  // ASCII keys deliberately share no words with the surrounding Italian rows, so
  // they can't fuzzy-collide with the WLTP sub-cycle labels.
  { type: 'kv', keys: ['CUPRACOMBINEDPETROL'],
    field: 'fuel_consumption_combined',
    extract: (v) => /kWh/i.test(v) ? undefined : extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv', keys: ['CUPRACOMBINEDELECTRIC'],
    field: 'ev_consumption_combined',
    extract: (v) => /kWh/i.test(v) ? extractFirstNumber(v) : undefined,
    confidence: 'high' },
  { type: 'kv', keys: ['CUPRACOMBINEDRANGE'],
    field: 'ev_range_km',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
]

// ─── Finance rules ──────────────────────────────────────────────────────────────
const financeRules: FinanceRule[] = [
  // "…204 CV a € 43.621,42 (chiavi in mano IPT esclusa)" — real cash price for TCO
  { pattern: /\ba\s+([\d.,]+)\s*€\s*\(chiavi\s+in\s+mano/iu, field: 'cash_price' },
  // Precise GFV from the prose ("Rata Finale di € 30.093,97"). The headline
  // "…Rata finale 30.094€" is immediately followed by a "1" footnote marker that
  // the generic currency normaliser splices onto the amount, so target this one.
  { pattern: /Rata\s+Finale\s+di\s+([\d.,]+)\s*€/iu, field: 'residual_value' },
  // CUPRA states the term as a rate count: "Durata 35 Rate"
  { pattern: /Durata\s+(\d+)\s+Rate/iu, field: 'duration_months' },
  // Contract mileage cap: "Percorrenza 30.000 km"
  { pattern: /Percorrenza\s+([\d.,]+)\s*km/iu, field: 'annual_km_limit' },
]

export const cupraPlugin: ParserPlugin = {
  id: 'cupra-it',
  displayName: 'CUPRA',
  priority: 10,

  detectSpecs(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('cupra'))
    add(0.3, t.includes('codice di configurazione') || t.includes('la tua configurazione'))
    add(0.3, t.includes('cupra connect') || t.includes('cupra garage') || t.includes('cupra virtual cockpit') || t.includes('cupraofficial'))
    return total > 0 ? score / total : 0
  },

  detectFinance(text) {
    const t = text.toLowerCase()
    let score = 0, total = 0
    const add = (w: number, hit: boolean) => { total += w; if (hit) score += w }
    add(0.4, t.includes('cupra'))
    add(0.3, t.includes('cupra way'))
    add(0.3, t.includes('cupra garage') || t.includes('cupraofficial'))
    return total > 0 ? score / total : 0
  },

  // CUPRA emissions blocks are noisy and ambiguous — canonicalise the rows we
  // cost on (combined petrol, combined electric, combined electric range) to
  // unique keys, drop the sub-cycle distractors, and strip the legal section
  // (whose www.cupraofficial.it URL otherwise hijacks make-detection). Finally,
  // infer BEV for electric-only outputs that carry no explicit fuel-type marker.
  preprocessSpecs(raw) {
    const cut = raw.split(/\n\s*NOTE LEGALI/i)[0]
    const out: string[] = []
    for (const line of cut.split('\n')) {
      const l = line.trim()
      if (!l) continue
      // "LA TUA CONFIGURAZIONE" matches the generic "La tua <Make>" identity rule
      if (/^LA TUA CONFIGURAZIONE$/i.test(l)) continue
      // Weighted / charge-phase figures blend in electric assist — we cost on the
      // plain WLTP combined figure instead.
      if (/consumo benzina ponderato/i.test(l)) continue
      if (/fase\s+(?:di scarica|sostenuta)/i.test(l)) continue

      const val = l.includes(':') ? l.slice(l.indexOf(':') + 1).trim() : ''

      // Combined electric consumption (kWh) → canonical key. Covers both
      // "…ciclo di prova combinato (Elettrico)" and "Consumo elettrico ciclo combinato".
      if (/combinato/i.test(l) && /kWh/i.test(l) && /elettric/i.test(l)) {
        out.push(`CUPRACOMBINEDELECTRIC: ${val}`); continue
      }
      // Drop the electric sub-cycle (basso/medio/alto/urbano…) rows that remain.
      // Note: "150 kW" has no trailing 'h', so this never eats a power figure.
      if (/kWh/i.test(l)) continue
      // Combined petrol consumption (l/100km) → canonical key.
      if (/combinato/i.test(l) && /l\/100\s*km/i.test(l) && !/elettric/i.test(l)) {
        out.push(`CUPRACOMBINEDPETROL: ${val}`); continue
      }
      // Range: drop urban / equivalent variants, canonicalise the combined one.
      if (/autonomia/i.test(l) && (/equivalente/i.test(l) || /ciclo urbano/i.test(l))) continue
      if (/autonomia/i.test(l) && /combinato/i.test(l)) {
        out.push(`CUPRACOMBINEDRANGE: ${val}`); continue
      }

      out.push(l)
    }
    // Electric-only configurators (Raval) carry no explicit "BEV"/"100% elettrico"
    // marker — infer it from the absence of any combustion/hybrid wording so
    // fuel_type resolves. (Keyed off a kv pair so it can't be read as the model.)
    const lc = cut.toLowerCase()
    if (/elettric/.test(lc) && !/(benzina|ibrid|plug-?in|gpl|metano|diesel)/.test(lc)) {
      out.push('Alimentazione: BEV')
    }
    return out.join('\n')
  },

  specRules,
  financeRules,
}
