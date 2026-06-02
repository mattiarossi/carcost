import type { ParsedSpecs, ParsedFinance, FuelType, Confidence } from './types.js'
import { parseItalianNumber, extractFirstNumber } from './utils.js'

// ─── Spec rules ──────────────────────────────────────────────────────────────
//
// Two rule shapes:
//
//  LineRule  — matched against whole raw lines via regex.
//              Used for fuel type, transmission, hybrid architecture etc.
//              where the information is embedded in a heading / sentence
//              with no key-value delimiter.
//
//  KvRule    — matched against the KEY side of a tab/colon-delimited pair
//              using Fuse.js fuzzy search. `keys` is a plain human-readable
//              list of canonical phrases from various makers (IT + EN).
//              No regex — just add more phrases to extend maker coverage.

export interface LineRule {
  type: 'line'
  patterns: RegExp[]
  field: keyof Omit<ParsedSpecs, 'raw_extras' | 'confidence'>
  extract: (value: string, fullLine: string) => string | number | undefined
  confidence: Confidence
}

export interface KvRule {
  type: 'kv'
  /** Canonical phrases matched via Fuse.js against the incoming KV key */
  keys: string[]
  field: keyof Omit<ParsedSpecs, 'raw_extras' | 'confidence'>
  extract: (value: string, fullLine: string) => string | number | undefined
  confidence: Confidence
}

export type SpecRule = LineRule | KvRule

export const specRules: SpecRule[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // LINE RULES — whole-line inference (fuel type, transmission, architecture)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Fuel type — ordered most-specific first ────────────────────────────
  // ── Fuel type — ordered most-specific first ───────────────────────────
  { type: 'line', patterns: [/full[\s-]?electric/i, /100\s*%\s*elet/i, /\bBEV\b/, /solo\s+elettric/i, /puramente\s+elettric/i],
    field: 'fuel_type', extract: () => 'BEV' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/ibrido\s+plug.?in/i, /plug.?in\s+hybrid/i, /\bPHEV\b/, /ricaricabile/i, /plug.?in/i],
    field: 'fuel_type', extract: () => 'PHEV' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/mild[\s-]?hybrid/i, /\bMHEV\b/, /\b48[\s-]?V\b.*(?:bsg|isg|generator|alternator)/i, /micro.?ibrido/i, /ibrido\s+leggero/i],
    field: 'fuel_type', extract: () => 'MHEV' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/self.?charging/i, /auto.?ricaricante/i, /\bHEV\b/, /ibrido\s+full/i, /full[\s-]?hybrid/i, /e:HEV/i, /\bTHS\b/, /Toyota\s+Hybrid/i],
    field: 'fuel_type', extract: () => 'HEV' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/\bGPL\b/, /\bLPG\b/, /bi.?fuel/i, /benzina.*GPL/i, /GPL.*benzina/i, /bifuel/i],
    field: 'fuel_type', extract: () => 'LPG' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/\bCNG\b/, /\bmetano\b/i, /benzina.*metano/i, /metano.*benzina/i],
    field: 'fuel_type', extract: () => 'CNG' as FuelType, confidence: 'high' },
  { type: 'line', patterns: [/\bibrido\b/i, /\bhybrid\b/i],
    field: 'fuel_type', extract: () => 'HEV' as FuelType, confidence: 'low' },

  // ── Hybrid architecture ────────────────────────────────────────────────
  { type: 'line', patterns: [/\bP0\b/, /belt[\s-]?starter/i, /\b48[\s-]?V\b/],
    field: 'hybrid_architecture', extract: () => 'P0', confidence: 'high' },
  { type: 'line', patterns: [/Toyota\s+Hybrid\s+System/i, /\bTHS\b/, /power.?split/i, /e-CVT/i],
    field: 'hybrid_architecture', extract: () => 'series-parallel', confidence: 'high' },

  // ── Transmission ──────────────────────────────────────────────────────
  { type: 'line', patterns: [/cambio\s+automatico/i, /automatic\s+transmission/i, /\bCVT\b/, /e-CVT/i, /automatico/i, /automatica/i, /\bAT\b/],
    field: 'transmission', extract: () => 'automatic', confidence: 'high' },
  { type: 'line', patterns: [/cambio\s+manuale/i, /manual\s+transmission/i, /manuale/i],
    field: 'transmission', extract: () => 'manual', confidence: 'high' },

  // ── Generic 'Potenza massima 110 kW' sentence (e.g. VW, others) ──────────
  { type: 'line', patterns: [/potenza massima\s+[\d.,]+\s*kW/i],
    field: 'engine_power_kw',
    extract: (_, line) => { const m = line.match(/potenza massima\s+([\d.,]+)\s*kW/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },

  // ── Renault "Potenza Massima KWCEE (Cv) 80 (160)" — kW first, CV in parens ──
  { type: 'line', patterns: [/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+\s*\([\d.,]+\)/i],
    field: 'engine_power_cv',
    extract: (_, line) => { const m = line.match(/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+\s*\(([\d.,]+)\)/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },
  { type: 'line', patterns: [/potenza massima\s+kw\s*cee\s*\(cv\)\s*[\d.,]+/i],
    field: 'engine_power_kw',
    extract: (_, line) => { const m = line.match(/potenza massima\s+kw\s*cee\s*\(cv\)\s*([\d.,]+)/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },

  // ── CO2 inline (no delimiter): "Emissioni CO2 ciclo di prova combinato 130 g/km" ──
  { type: 'line', patterns: [/emissioni\s+co2.*(\d[\d,.]+)\s*g\/km/i],
    field: 'co2_gkm',
    extract: (_, line) => { const m = line.match(/([\d.,]+)\s*g\/km/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'low' },

  // ── Emission class as standalone line (e.g. "Euro 6d") ────────────────
  { type: 'line', patterns: [/\beuro\s+6[a-z-]?\b/i, /\bEURO\s+\d/i],
    field: 'emission_class',
    extract: (_, line) => { const m = line.match(/euro\s+\d[a-z-]*/i); return m ? m[0] : line.trim() },
    confidence: 'low' },

  // ══════════════════════════════════════════════════════════════════════════
  // KV RULES — fuzzy-matched against the KEY side of tab/colon-split pairs
  // Add more phrases to `keys` to cover new makers without touching regexes.
  // ══════════════════════════════════════════════════════════════════════════

  // ── System / total power ──────────────────────────────────────────────
  { type: 'kv',
    keys: ['potenza massima totale', 'potenza sistema', 'potenza complessiva', 'system power',
           'combined power', 'potenza totale kW', 'potenza motore sistema',
           'phev Combined Output Kw phev Combined Output Hp Label',  // Hyundai
           'phev MaxPower Kw phev MaxPower Hp Label'],               // Hyundai fallback
    field: 'engine_power_kw',
    // handles "211,8 / 288" (kW / CV) or plain "132.4 / 180" — take first number
    extract: (v) => { const m = v.match(/([\d.,]+)\s*(?:kW|\/)/i); return m ? parseItalianNumber(m[1]) : extractFirstNumber(v) },
    confidence: 'high' },
  { type: 'kv',
    keys: ['potenza kW', 'kW', 'potenza massima kW', 'motore kW', 'power kW'],
    field: 'engine_power_kw',
    // Only extract if value explicitly contains kW unit — avoids spurious matches on plain numbers
    extract: (v) => { const m = v.match(/([\d.,]+)\s*kW/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'low' },
  { type: 'kv',
    keys: ['potenza CV', 'cavalli vapore', 'horsepower', 'HP', 'PS', 'potenza massima CV', 'motore CV'],
    field: 'engine_power_cv',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['potenza motore elettrico', 'electric motor power', 'potenza elettrica kW', 'electric motor kW',
           'motore elettrico kW', 'potenza motore MG'],
    field: 'engine_power_kw_electric',
    extract: (v) => { const m = v.match(/([\d.,]+)\s*kW/i); return m ? parseItalianNumber(m[1]) : undefined },
    confidence: 'high' },
  { type: 'kv',
    keys: ['coppia massima', 'coppia', 'torque', 'Nm', 'coppia Nm', 'momento torcente'],
    field: 'torque_nm',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Performance ───────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['0-100 km/h (sec)', '0-100 km/h', 'da 0 a 100', 'acceleration 0-100',
           '0 100 km/h s', 'Beschleunigung 0-100', 'acceleration 0 100'],
    field: 'acceleration_0_100_s',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['Velocità max. (km/h)', 'velocità massima', 'velocità max', 'top speed',
           'Vmax', 'velocità di punta', 'Höchstgeschwindigkeit', 'max speed km/h'],
    field: 'top_speed_kmh',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['Cilindrata (cc)', 'cilindrata', 'displacement', 'engine displacement',
           'cubatura', 'Hubraum', 'cylinderDisplacement', 'engine cc'],
    field: 'engine_displacement_cc',
    // Italian format: 1.598 = 1598 cc (thousands separator)
    extract: (v) => { const n = extractFirstNumber(v); return n !== undefined && n < 10 ? Math.round(n * 1000) : n },
    confidence: 'high' },

  // ── EV consumption ────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['consumo energia elettrica', 'consumo elettrico WLTP', 'consumo combinato kWh',
           'kWh per 100 km', 'consumo WLTP kWh', 'electric consumption WLTP',
           'energy consumption', 'consumo kWh 100km', 'Verbrauch kWh',
           // Generic "Combinato WLTP" keys — unit in value decides routing
           'Combinato WLTP', 'Combinato kWh/100km WLTP'],
    field: 'ev_consumption_combined',
    // Only accept values whose unit is kWh — l/100km values belong in fuel_consumption_combined
    extract: (v) => /kWh/i.test(v) ? extractFirstNumber(v) : undefined,
    confidence: 'high' },

  // ── EV range ──────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['autonomia elettrica', 'autonomia WLTP', 'range WLTP', 'electric range',
           'autonomia km', 'autonomia combinata WLTP', 'Reichweite WLTP', 'zero emission range',
           'percorrenza massima elettrica',
           'elektrische Reichweite City voller Batterie WLTP', 'elektrische Reichweite WLTP',
           'max elektrische Reichweite City voller Batterie km nach WLTP',
           // Hyundai configurator exact key:
           'max. elektrische Reichweite (City) bei voller Batterie (km) nach WLTP',
           'autonomia elettrica WLTP City', 'max electric range city full battery',
           // Hyundai Italian configurator:
           'Autonomia elettrica WLTP (km)', 'autonomia solo elettrica WLTP',
           // Toyota configurator:
           'Percorrenza max in EV WLTP', 'Percorrenza max in EV - WLTP'],
    field: 'ev_range_km',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Battery ───────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['capacità batteria', 'capacità totale batteria', 'battery capacity',
           'batteria kWh', 'capacità accumulatore', 'total battery kWh',
           'Kapazität Batterie (kWh)', 'Batteriekapazität kWh',
           'Capacità totale della batteria (kWh)', 'Capacità batteria (kWh)',
           // Toyota configurator:
           'Capacità della batteria'],
    field: 'battery_capacity_kwh',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['capacità batteria utilizzabile', 'usable battery', 'capacità netta batteria',
           'batteria utilizzabile kWh', 'net battery capacity', 'batteria netta'],
    field: 'battery_capacity_usable_kwh',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Charging ──────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['potenza ricarica massima', 'max charging power', 'potenza massima ricarica',
           'ricarica rapida kW', 'DC charging power', 'ricarica DC kW', 'max charge power'],
    field: 'max_charge_power_kw',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['tempo ricarica AC', 'charge time AC', 'ricarica corrente alternata',
           'tempo ricarica completa', 'charging time 0 100', 'ricarica AC ore'],
    field: 'charge_time_ac_h',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['ricarica 10 80', 'charge time 10 80', 'fast charge 10 80',
           'DC ricarica 10 80', 'ricarica rapida 10 80 minuti'],
    field: 'charge_time_10_80_min',
    extract: (v) => { const n = extractFirstNumber(v); return n !== undefined ? Math.round(n) : undefined },
    confidence: 'high' },

  // ── ICE / Hybrid fuel consumption ─────────────────────────────────────
  { type: 'kv',
    keys: ['consumo urbano', 'consumo percorso urbano', 'urban fuel consumption',
           'city consumption', 'consumo città', 'Verbrauch Stadt', 'percorso urbano l/100km',
           // VW sub-cycle keys:
           'Consumo ciclo di prova basso', 'consumo ciclo basso',
           'Consumo ciclo di prova medio', 'consumo ciclo medio'],
    field: 'fuel_consumption_urban',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['consumo extraurbano', 'consumo fuori città', 'extra-urban consumption',
           'consumo periferia', 'Verbrauch außerorts', 'suburban fuel consumption',
           'percorso extraurbano l/100km',
           // VW sub-cycle keys:
           'Consumo ciclo di prova alto', 'consumo ciclo alto',
           'Consumo ciclo di prova extra alto', 'consumo ciclo extra alto'],
    field: 'fuel_consumption_suburban',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['consumo combinato', 'consumo misto', 'combined consumption', 'combined fuel consumption',
           'Combinato l/100km', 'Combinato WLTP', 'consumi ciclo WLTP', 'L/100 km WLTP',
           'consumo carburante WLTP', 'fuel consumption WLTP', 'Verbrauch kombiniert',
           'consumo combinato WLTP', 'ciclo combinato l/100km', 'carburante combinato',
           'Consumo di carburante ciclo combinato WLTP (l/100km)',
           // VW configurator exact key:
           'Consumo ciclo di prova combinato',
           'Consumo carburante ciclo combinato WLTP',
           'Consumo Ciclo Misto (L/100 Km)', 'consumo ciclo misto'],
    field: 'fuel_consumption_combined',
    // Reject kWh values — those belong in ev_consumption_combined
    extract: (v) => /kWh/i.test(v) ? undefined : extractFirstNumber(v),
    confidence: 'high' },

  // ── LPG / CNG ─────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['consumo GPL', 'consumo gas', 'LPG consumption', 'consumo bifuel GPL'],
    field: 'lpg_consumption_combined',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['consumo metano', 'CNG consumption', 'consumo CNG', 'kg per 100 km'],
    field: 'cng_consumption_combined',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Emissions ─────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['CO2 ponderato', 'CO2 pesato', 'weighted CO2', 'emissioni CO2 ponderate', 'CO2 weighted WLTP'],
    field: 'co2_gkm_weighted',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['emissioni CO2', 'CO2 g/km', 'CO2 WLTP', 'emissioni di CO2',
           'Emissioni CO2 g/km WLTP', 'CO2 emissions', 'CO2 Emissionen',
           'emissioni anidride carbonica', 'carbon dioxide emissions', 'Emissioni CO2 g km WLTP',
           'Emissioni di CO2 (ciclo combinato WLTP)', 'emissioni CO2 ciclo combinato WLTP',
           'CO2 Ciclo Misto (G/Km)', 'co2 ciclo misto'],
    field: 'co2_gkm',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },
  { type: 'kv',
    keys: ['classe emissioni', 'classe di emissioni', 'emission class', 'euro norm',
           'norma emissioni', 'categoria emissioni', 'Emissionsklasse', 'standard emissioni'],
    field: 'emission_class',
    extract: (v) => v.trim(),
    confidence: 'high' },
  { type: 'kv',
    keys: ['emissioni NOx', 'NOx g/km', 'NOx WLTP', 'Emissioni NOx g/km WLTP',
           'NOx emissions', 'ossidi di azoto', 'nitrogen oxide emissions', 'Emissioni NOx g km WLTP'],
    field: 'nox_gkm',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Weight ────────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['peso a vuoto', 'massa a vuoto', 'curb weight', 'unladen weight',
           'peso complessivo', 'peso kg', 'Leergewicht', 'massa veicolo'],
    field: 'weight_kg',
    extract: (v) => extractFirstNumber(v),
    confidence: 'high' },

  // ── Model year ────────────────────────────────────────────────────────
  { type: 'kv',
    keys: ['anno modello', 'model year', 'MY', 'anno di produzione'],
    field: 'year',
    extract: (v) => { const m = v.match(/\b(20[2-3]\d)\b/); return m ? parseInt(m[1], 10) : undefined },
    confidence: 'low' },
]

// ── Known car makes for identity detection ────────────────────────────────────

export const KNOWN_MAKES = [
  'Toyota', 'Fiat', 'Volkswagen', 'VW', 'Renault', 'Peugeot', 'Citroën', 'Citroen',
  'Opel', 'Ford', 'Hyundai', 'Kia', 'Dacia', 'Skoda', 'Seat', 'Cupra',
  'BMW', 'Mercedes', 'Audi', 'Alfa Romeo', 'Jeep', 'Nissan', 'Mitsubishi',
  'Honda', 'Mazda', 'Subaru', 'Suzuki', 'Volvo', 'BYD', 'Tesla',
  'Stellantis', 'Lancia', 'DS', 'Maserati', 'Lamborghini', 'Ferrari',
]

export const MAKE_PATTERN = new RegExp(
  KNOWN_MAKES.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
)

// ─── Finance rules ────────────────────────────────────────────────────────────

export interface FinanceRule {
  pattern: RegExp
  /** Single field name or tuple for patterns that capture two groups */
  field: keyof Omit<ParsedFinance, 'raw_text' | 'raw_extras' | 'confidence'> | [keyof Omit<ParsedFinance, 'raw_text' | 'raw_extras' | 'confidence'>, keyof Omit<ParsedFinance, 'raw_text' | 'raw_extras' | 'confidence'>]
}

export const financeRules: FinanceRule[] = [
  { pattern: /[Pp]rezzo\s+(?:di\s+vendita|auto|listino|d'acquisto)[^€\d]*([\d.,]+)\s*€/u,   field: 'list_price' },
  { pattern: /[Pp]rezzo\s+(?:totale\s+)?(?:del\s+)?veicolo[^€\d]*([\d.,]+)\s*€/u,            field: 'list_price' },
  // Discounted cash price (actual price without financing — use this for TCO)
  { pattern: /[Pp]rezzo\s+in\s+promozione\s+senza\s+finanziamento[^€\d]*([\d.,]+)\s*€/u,     field: 'cash_price' },
  { pattern: /[Pp]rezzo\s+(?:scontato|promo(?:zionale)?)\s+(?:senza\s+finanziamento|al\s+pubblico)[^€\d]*([\d.,]+)\s*€/u, field: 'cash_price' },
  // Renault: "Prezzo promozionale\n25.924,45 €" (standalone, no qualifier)
  { pattern: /[Pp]rezzo\s+promozionale[^€\d]*([\d.,]+)\s*€/u,                                field: 'cash_price' },
  { pattern: /[Aa]nticipo\s+([\d.,]+)\s*€/u,                                                  field: 'deposit' },
  { pattern: /(\d+)\s+rate\s+(?:mensili\s+)?(?:da|di)\s+([\d.,]+)\s*€/u,                     field: ['n_installments', 'monthly_installment'] },
  { pattern: /(\d+)\s+(?:mesi|mensilità)\s+.*?([\d.,]+)\s*€\s*\/?\s*(?:mese|m(?:es)?\.?)/ui, field: ['n_installments', 'monthly_installment'] },
  { pattern: /[Rr]ata\s+finale(?:\s+garantita)?[^€\d]*([\d.,]+)\s*€/u,                       field: 'residual_value' },
  { pattern: /\bVFG\b[^€\d]*([\d.,]+)\s*€/u,                                                  field: 'residual_value' },
  { pattern: /[Vv]alore\s+[Ff]uturo\s+[Gg]arantito[^€\d]*([\d.,]+)\s*€/u,                   field: 'residual_value' },
  { pattern: /[Dd]urata(?:\s+del\s+finanziamento)?[:\s]+(\d+)\s*mes/ui,                       field: 'duration_months' },
  { pattern: /[Dd]a\s+restituire\s+in\s+(\d+)\s+rate\s+mensili/ui,                           field: 'duration_months' },
  { pattern: /[Ii]mporto\s+(?:totale\s+)?(?:del\s+)?finanziato[^€\d]*([\d.,]+)\s*€/u,        field: 'total_financed' },
  { pattern: /[Ii]mporto\s+totale\s+del\s+credito[^€\d]*([\d.,]+)\s*€/u,                     field: 'total_financed' },
  { pattern: /[Tt]otale\s+da\s+(?:pagare|rimborsare)[^€\d]*([\d.,]+)\s*€/u,                  field: 'total_repayable' },
  { pattern: /[Ii]mporto\s+da\s+rimborsare[^€\d]*([\d.,]+)\s*€/u,                            field: 'total_repayable' },
  { pattern: /[Ii]mporto\s+totale\s+(?:dovuto|finanziato)[^€\d]*([\d.,]+)\s*€/u,             field: 'total_repayable' },
  { pattern: /TAN\s+(?:\(fisso\)|fisso)?\s*(\d+[,.]\d+)\s*%/u,                               field: 'tan_pct' },
  { pattern: /TAEG\s+(\d+[,.]\d+)\s*%/u,                                                      field: 'taeg_pct' },
  { pattern: /percorrenza\s+(?:chilometrica\s+)?(?:annua(?:le)?|massima)\s+(?:di\s+)?(\d[\d.,]*)\s*km/ui, field: 'annual_km_limit' },
  { pattern: /max\.\s*km\s+totali\s+([\d.,]+)/ui,                                             field: 'annual_km_limit' },
  { pattern: /(?:spese|contributo)\s+d['i]\s*istruttoria[^€\d]*([\d.,]+)\s*€/ui,             field: 'instruction_fees' },
  { pattern: /\bistruttoria\b[^€\d]*([\d.,]+)\s*€/ui,                                        field: 'instruction_fees' },
  { pattern: /(?:spese|commissione)\s+(?:di\s+)?incasso[^€\d]*([\d.,]+)\s*€/ui,               field: 'monthly_fees' },
  { pattern: /\bincasso\s+rata[^€\d]*([\d.,]+)\s*€/ui,                                       field: 'monthly_fees' },
]
