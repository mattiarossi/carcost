import Fuse from 'fuse.js'
import type { ParsedSpecs } from '../types.js'
import type { SpecRule, KvRule, LineRule } from '../keywords.js'
import { normaliseText, normaliseKey, splitKeyValue } from '../utils.js'
import type { Segment } from './types.js'

// ── Stage 1: pre-process ──────────────────────────────────────────────────────

function preprocess(raw: string): Segment[] {
  const text = normaliseText(raw)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.map((line) => {
    const kv = splitKeyValue(line)
    return kv ? { raw: line, key: kv.key, value: kv.value } : { raw: line }
  })
}

// ── Fuse index — built once per call from all KV rules ────────────────────────

interface FuseEntry {
  phrase: string
  ruleIndex: number
}

function buildFuseIndex(rules: KvRule[]): Fuse<FuseEntry> {
  const entries: FuseEntry[] = []
  rules.forEach((rule, ruleIndex) => {
    rule.keys.forEach((phrase) => entries.push({ phrase: normaliseKey(phrase), ruleIndex }))
  })
  return new Fuse(entries, {
    keys: ['phrase'],
    threshold: 0.3,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 4,
  })
}

// ── Stage 2: apply rules ──────────────────────────────────────────────────────

function applyRules(
  segments: Segment[],
  rules: SpecRule[],
): {
  result: Partial<Omit<ParsedSpecs, 'raw_extras' | 'confidence'>>
  confidence: ParsedSpecs['confidence']
  consumed: Set<number>
} {
  const result: Partial<Omit<ParsedSpecs, 'raw_extras' | 'confidence'>> = {}
  const confidence: ParsedSpecs['confidence'] = {}
  const consumed = new Set<number>()

  const lineRules = rules.filter((r): r is LineRule => r.type === 'line')
  const kvRules   = rules.filter((r): r is KvRule   => r.type === 'kv')
  const fuseIndex = buildFuseIndex(kvRules)

  function tryAssign(
    field: keyof typeof result,
    ruleConf: 'high' | 'low',
    extractFn: KvRule['extract'] | LineRule['extract'],
    valueStr: string,
    rawLine: string,
    segIndex: number,
  ) {
    if (result[field] !== undefined && confidence[field] === 'high') return
    const extracted = extractFn(valueStr, rawLine)
    if (extracted === undefined || (typeof extracted === 'number' && isNaN(extracted))) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(result as any)[field] = extracted
    confidence[field] = ruleConf
    consumed.add(segIndex)
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    for (const rule of lineRules) {
      if (rule.patterns.some((p) => p.test(seg.raw))) {
        tryAssign(rule.field as keyof typeof result, rule.confidence, rule.extract, seg.raw, seg.raw, i)
      }
    }

    if (seg.key && seg.key.length <= 80) {
      const hits = fuseIndex.search(normaliseKey(seg.key))
      for (const hit of hits.slice(0, 3)) {
        const rule = kvRules[hit.item.ruleIndex]
        const valueStr = seg.value ?? seg.raw
        const before = result[rule.field as keyof typeof result]

        if (before !== undefined && confidence[rule.field as keyof typeof result] === 'high') break

        tryAssign(rule.field as keyof typeof result, rule.confidence, rule.extract, valueStr, seg.raw, i)
        if (result[rule.field as keyof typeof result] !== before) break
      }
    }
  }

  return { result, confidence, consumed }
}

// ── Identity detection ────────────────────────────────────────────────────────

function detectIdentity(
  segments: Segment[],
  existing: Partial<Omit<ParsedSpecs, 'raw_extras' | 'confidence'>>,
  confidence: ParsedSpecs['confidence'],
): void {

  // ── A-1: "Configurazione del [date] [Make] [MODEL]" — Renault ────────────
  if (!existing.make || !existing.model) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const m = seg.raw.match(/^Configurazione\s+del\s+[\d/]+\s+([A-Z][a-zA-Z]+)\s+([A-Z][A-Z0-9\-]+)/i)
      if (!m) continue
      if (!existing.make)  { existing.make  = m[1]; confidence.make  = 'high' }
      if (!existing.model) { existing.model = m[2]; confidence.model = 'high' }
      if (!existing.trim && i + 1 < segments.length) {
        const nextKey = segments[i + 1].key ?? segments[i + 1].raw
        const trimWord = nextKey.match(/^([a-zA-ZÀ-ÿ]+(?:\s+[a-zA-ZÀ-ÿ]+)*?)(?:\s+\d|\s+E-Tech|\s+full|\s+plug|\s+hybrid|$)/i)
        if (trimWord) {
          existing.trim = trimWord[1].trim()
          confidence.trim = 'high'
        }
      }
      break
    }
  }

  // ── A0: "La tua [Make] [MODEL]..." — Hyundai / generic Italian ──────────
  if (!existing.make || !existing.model) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const m = seg.raw.match(/^(?:La tua|Il tuo)\s+([A-Z][a-zA-Z]+)\s+([A-Z][A-Z0-9\-]+)/i)
      if (!m) continue
      if (!existing.make)  { existing.make  = m[1]; confidence.make  = 'high' }
      if (!existing.model) { existing.model = m[2]; confidence.model = 'high' }
      if (!existing.trim && i + 1 < segments.length) {
        const next = segments[i + 1].raw
        const trimMatch = next.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]+?),/)
        if (trimMatch) {
          const candidate = trimMatch[1].trim()
          if (!/\d/.test(candidate) && !/\b(phev|hybrid|bev|ice|mhev|hev|plug|electric)\b/i.test(candidate)) {
            existing.trim = candidate
            confidence.trim = 'high'
          }
        }
      }
      break
    }
  }

  // ── A: "Configura [Model] [Trim]" — Toyota IT configurator ──────────────
  if (!existing.model) {
    for (const seg of segments) {
      const m = seg.raw.match(/^Configura\s+(.+)/i)
      if (!m) continue
      const words = m[1].trim().split(/\s+/)
      if (words.length >= 3) {
        existing.model = words.slice(0, -1).join(' ')
        existing.trim  = words[words.length - 1]
        confidence.model = 'high'
        confidence.trim  = 'high'
      } else if (words.length === 2) {
        existing.model = words.join(' ')
        confidence.model = 'high'
      } else {
        existing.model = words[0]
        confidence.model = 'high'
      }
      break
    }
  }

  // ── A2: "Nuovo/Nuova [Model] [Trim]..." — VW-style header ───────────────
  if (!existing.model) {
    for (const seg of segments) {
      const m = seg.raw.match(/^(?:Nuov[oa]|New)\s+(.+)/i)
      if (!m) continue
      if (/\w\.\s/.test(seg.raw)) continue
      const rest = m[1].trim()
      const specStart = rest.search(/\d|\bkW\b|\bCV\b|\beTSI\b|\bTSI\b|\bTDI\b|\bGTE\b/)
      const namePart = specStart > 0 ? rest.slice(0, specStart).trim() : rest
      const nameWords = namePart.split(/\s+/).filter(Boolean)
      if (nameWords.length === 0) continue
      const modelWords = nameWords.length > 2 ? nameWords.slice(0, -1) : [nameWords[0]]
      const trimWords  = nameWords.length > 1 ? nameWords.slice(modelWords.length) : []
      existing.model = modelWords.join(' ')
      confidence.model = 'high'
      if (trimWords.length > 0 && !existing.trim) {
        existing.trim = trimWords.join(' ')
        confidence.trim = 'high'
      }
      break
    }
  }

  // ── B: finance "su [Model] - MY[YY|YYYY]" ────────────────────────────────
  for (const seg of segments) {
    const m = seg.raw.match(/\bsu\s+([A-Z][A-Za-z\s]+?)\s*[-–]\s*MY\s*(\d{2,4})\b/i)
    if (!m) continue
    const raw = parseInt(m[2])
    const year = raw < 100 ? 2000 + raw : raw
    if (!existing.year) { existing.year = year; confidence.year = 'high' }
    if (!existing.model) {
      existing.model = m[1].trim()
      confidence.model = 'low'
    }
    break
  }

  // ── C: MY[YY|YYYY] anywhere ───────────────────────────────────────────────
  if (!existing.year) {
    for (const seg of segments) {
      const m = seg.raw.match(/\bMY\s*(20[2-9]\d)\b/i)
            ?? seg.raw.match(/\bMY\s*(\d{2})\b/i)
            ?? seg.raw.match(/\b(20[2-9]\d)\b/)
      if (!m) continue
      const raw = parseInt(m[1])
      existing.year = raw < 100 ? 2000 + raw : raw
      confidence.year = 'low'
      break
    }
  }

  // ── D: make from contextual brand mentions ────────────────────────────────
  if (!existing.make) {
    for (const seg of segments) {
      const fs = seg.raw.match(/\b([A-Z][a-zA-Z]+)\s+Financial\s+Services\b/)
      if (fs) { existing.make = fs[1]; confidence.make = 'high'; break }

      const tua = seg.raw.match(/^(?:La tua|Il tuo)\s+([A-Z][a-zA-Z]+)\s*$/i)
      if (tua) { existing.make = tua[1]; confidence.make = 'high'; break }

      const titleEnd = seg.raw.match(/\.\s+Style\s+([A-Z][a-zA-Z]+)\s*$/)
      if (titleEnd) { existing.make = titleEnd[1]; confidence.make = 'high'; break }

      const en = seg.raw.match(/\b([A-Z][a-zA-Z]+)\s+Easy\s+Next\b/)
      if (en) { existing.make = en[1]; confidence.make = 'low'; break }

      const url = seg.raw.match(/www\.([a-z]+)(?:-fs)?\.(?:it|com|de|fr|es)\b/i)
      if (url) {
        const brand = url[1].replace(/-fs$/i, '')
        existing.make = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
        confidence.make = 'low'
        break
      }
    }
  }

  // ── E: generic first short Title-Case line → model fallback ──────────────
  if (!existing.model) {
    for (const seg of segments) {
      if (seg.key) continue
      const words = seg.raw.split(/\s+/)
      if (words.length < 1 || words.length > 5) continue
      if (!/^[A-Z]/.test(seg.raw)) continue
      if (/\b(il|la|lo|le|gli|di|da|in|con|su|per|tra|fra|the|of|and|or)\b/i.test(seg.raw)) continue
      if (/[.,;]/.test(seg.raw)) continue
      if (/\b(hybrid|ibrido|automatico|manuale|trazione|anteriore|posteriore|integrale|elettric|benzina|diesel|mild|full|plug)\b/i.test(seg.raw)) continue
      existing.model = seg.raw.trim()
      confidence.model = 'low'
      break
    }
  }
}

// ── Stage 3: collect unmatched segments ──────────────────────────────────────

function collectRawExtras(segments: Segment[], consumed: Set<number>): Record<string, string> {
  const extras: Record<string, string> = {}
  for (let i = 0; i < segments.length; i++) {
    if (consumed.has(i)) continue
    const seg = segments[i]
    if (seg.key && seg.value) {
      extras[seg.key] = seg.value
    }
  }
  return extras
}

// ── Stage 4: post-process ────────────────────────────────────────────────────

function postProcess(
  result: Partial<Omit<ParsedSpecs, 'raw_extras' | 'confidence'>>,
  confidence: ParsedSpecs['confidence'],
): void {
  if (result.fuel_type === 'BEV') {
    if (result.fuel_consumption_combined != null && result.ev_consumption_combined == null) {
      result.ev_consumption_combined = result.fuel_consumption_combined
      confidence.ev_consumption_combined = confidence.fuel_consumption_combined
    }
    result.fuel_consumption_combined = undefined
    confidence.fuel_consumption_combined = undefined
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pure spec engine. Takes raw pasted text and a rules array (brand rules first,
 * then generic rules). Returns a ParsedSpecs object.
 */
export function specEngine(rawText: string, rules: SpecRule[]): ParsedSpecs {
  const segments = preprocess(rawText)
  const { result, confidence, consumed } = applyRules(segments, rules)

  detectIdentity(segments, result, confidence)
  postProcess(result, confidence)

  const raw_extras = collectRawExtras(segments, consumed)

  return {
    ...result,
    raw_extras,
    confidence,
  } as ParsedSpecs
}
