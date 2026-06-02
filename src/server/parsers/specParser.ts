/**
 * Backward-compatible shim.
 * All logic now lives in engine/specEngine.ts; plugin system in registry.ts.
 * Callers that import parseSpecs from here continue to work unchanged.
 */
import * as registry from "./registry.js"
import type { ParsedSpecs } from "./types.js"

export function parseSpecs(rawText: string): ParsedSpecs {
  return registry.parseSpecs(rawText).result
}
