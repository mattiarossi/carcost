/**
 * Backward-compatible shim.
 * All logic now lives in engine/financeEngine.ts; plugin system in registry.ts.
 * Callers that import parseFinance from here continue to work unchanged.
 */
import * as registry from './registry.js'
import type { ParsedFinance } from './types.js'

export function parseFinance(rawText: string): ParsedFinance {
  return registry.parseFinance(rawText).result
}

