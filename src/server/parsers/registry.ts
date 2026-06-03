import type { ParsedSpecs, ParsedFinance } from './types.js'
import type { DetectionResult, ParserPlugin } from './plugin.js'
import { specEngine } from './engine/specEngine.js'
import { financeEngine } from './engine/financeEngine.js'
import { normaliseText } from './utils.js'
import { genericPlugin } from './plugins/generic/index.js'
import { toyotaPlugin }  from './plugins/toyota/index.js'
import { renaultPlugin } from './plugins/renault/index.js'
import { hyundaiPlugin } from './plugins/hyundai/index.js'

// Ordered: brand plugins first, generic last (catch-all)
const PLUGINS: ParserPlugin[] = [
  toyotaPlugin,
  renaultPlugin,
  hyundaiPlugin,
  genericPlugin,
]

function pluginByScore(
  text: string,
  type: 'specs' | 'finance',
): DetectionResult[] {
  const norm = normaliseText(text)
  return PLUGINS
    .map((p) => ({
      pluginId:    p.id,
      displayName: p.displayName,
      score: type === 'specs' ? p.detectSpecs(norm) : p.detectFinance(norm),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // tie-break: higher plugin priority wins
      const pa = PLUGINS.find((p) => p.id === a.pluginId)!.priority
      const pb = PLUGINS.find((p) => p.id === b.pluginId)!.priority
      return pb - pa
    })
}

/**
 * Score all plugins and return sorted descending.
 * Used by the UI detection pill and by parse*().
 */
export function detect(
  text: string,
  type: 'specs' | 'finance',
): DetectionResult[] {
  return pluginByScore(text, type)
}

/**
 * Parse specs using the best-scoring plugin (or an explicit override).
 * Brand rules are prepended to the generic rules so they shadow generic ones.
 */
export function parseSpecs(
  text: string,
  pluginId?: string,
): { result: ParsedSpecs; usedPlugin: string; alternatives: DetectionResult[] } {
  const ranked  = pluginByScore(text, 'specs')
  const chosen  = pluginId
    ? (PLUGINS.find((p) => p.id === pluginId) ?? genericPlugin)
    : PLUGINS.find((p) => p.id === ranked[0].pluginId)!

  const preprocessed = chosen.preprocessSpecs ? chosen.preprocessSpecs(text) : text

  const mergedRules =
    chosen.id === 'generic'
      ? (genericPlugin.specRules ?? [])
      : [...(chosen.specRules ?? []), ...(genericPlugin.specRules ?? [])]

  const result = specEngine(preprocessed, mergedRules)

  // Make fallback: some configurator exports (e.g. PDF spec sheets) never put
  // the brand next to the model in a parseable header — it only appears in
  // legal prose. When the engine can't extract `make` but a brand plugin won
  // detection, use that plugin's name. Low confidence so the UI still asks the
  // user to confirm.
  if (!result.make && chosen.id !== 'generic') {
    result.make = chosen.displayName
    result.confidence.make = 'low'
  }

  return {
    result,
    usedPlugin:   chosen.id,
    alternatives: ranked.filter((r) => r.pluginId !== chosen.id).slice(0, 3),
  }
}

/**
 * Parse finance using the best-scoring plugin (or an explicit override).
 */
export function parseFinance(
  text: string,
  pluginId?: string,
): { result: ParsedFinance; usedPlugin: string; alternatives: DetectionResult[] } {
  const ranked  = pluginByScore(text, 'finance')
  const chosen  = pluginId
    ? (PLUGINS.find((p) => p.id === pluginId) ?? genericPlugin)
    : PLUGINS.find((p) => p.id === ranked[0].pluginId)!

  const preprocessed = chosen.preprocessFinance ? chosen.preprocessFinance(text) : text

  const mergedRules =
    chosen.id === 'generic'
      ? (genericPlugin.financeRules ?? [])
      : [...(chosen.financeRules ?? []), ...(genericPlugin.financeRules ?? [])]

  const result = financeEngine(preprocessed, mergedRules)

  return {
    result,
    usedPlugin:   chosen.id,
    alternatives: ranked.filter((r) => r.pluginId !== chosen.id).slice(0, 3),
  }
}
