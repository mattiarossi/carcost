import type { SpecRule, FinanceRule } from './keywords.js'

/** Scored detection result for a single plugin on a given text. */
export interface DetectionResult {
  pluginId: string
  displayName: string
  /** 0–1. Higher = better match. Generic always returns 0.1 as a floor. */
  score: number
}

export interface ParserPlugin {
  /** Unique stable identifier, e.g. 'renault-it', 'toyota-it', 'generic'. */
  id: string
  /** Human-readable name shown in the UI detection pill. */
  displayName: string
  /**
   * Tie-break order when scores are equal.
   * Higher = preferred. Generic = 0; brand plugins should use 10+.
   */
  priority: number

  // ── Detection ──────────────────────────────────────────────────────────────
  /**
   * Returns a 0–1 confidence score. Called on already-normalised text.
   * Must be fast: only string.includes() and pre-compiled RegExp.test() calls.
   */
  detectSpecs(normalisedText: string): number
  detectFinance(normalisedText: string): number

  // ── Rules ──────────────────────────────────────────────────────────────────
  /**
   * Brand-specific spec rules. Prepended to the generic rule set before the
   * engine runs, so they shadow generic rules via "first high-confidence wins".
   * Omit (or leave undefined) to rely entirely on generic rules.
   */
  specRules?: SpecRule[]
  financeRules?: FinanceRule[]

  // ── Optional hooks ─────────────────────────────────────────────────────────
  /** Brand-specific text normalisation applied before engine tokenisation. */
  preprocessSpecs?(raw: string): string
  preprocessFinance?(raw: string): string
}
