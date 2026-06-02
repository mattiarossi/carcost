import type { ParserPlugin } from '../../plugin.js'
import { specRules } from '../../keywords.js'
import { financeRules } from '../../keywords.js'

/**
 * Generic plugin — wraps the shared keyword rules unchanged.
 * detect*() always returns 0.1 so it acts as a catch-all when no brand plugin
 * scores higher.
 */
export const genericPlugin: ParserPlugin = {
  id: 'generic',
  displayName: 'Generic',
  priority: 0,

  detectSpecs: () => 0.1,
  detectFinance: () => 0.1,

  specRules,
  financeRules,
}
