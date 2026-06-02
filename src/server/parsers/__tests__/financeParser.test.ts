/**
 * Finance-parser regression tests.
 * Each fixture is a real financing offer page.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseFinance } from '../financeParser.js'

const FIXTURES = join(process.cwd(), 'fixtures/configurator/financial')

function load(name: string) {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

function approx(actual: number | undefined, expected: number, tolerance = 0.05) {
  expect(actual, `expected ~${expected}`).toBeDefined()
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(tolerance)
}

// ─── Hyundai TUCSON PHEV ─────────────────────────────────────────────────────

describe('Hyundai TUCSON finance', () => {
  const result = parseFinance(load('hiunday-tucson.txt'))

  it('monthly_installment ~229',  () => approx(result.monthly_installment, 229, 1))
  it('deposit ~9760',             () => approx(result.deposit!, 9760, 1))
  it('tan_pct ~6.45',             () => approx(result.tan_pct!, 6.45, 0.01))
  it('taeg_pct ~7.48',            () => approx(result.taeg_pct!, 7.48, 0.01))
})

// ─── Toyota C-HR BEV ─────────────────────────────────────────────────────────

describe('Toyota C-HR finance', () => {
  const result = parseFinance(load('toyota-chr.txt'))

  it('deposit ~7000',             () => approx(result.deposit!, 7000, 1))
  it('residual_value ~14767',     () => approx(result.residual_value!, 14767.03, 1))
  it('tan_pct ~6.99',             () => approx(result.tan_pct!, 6.99, 0.01))
  it('taeg_pct ~7.69',            () => approx(result.taeg_pct!, 7.69, 0.01))
  it('monthly_installment ~787',  () => approx(result.monthly_installment!, 787.37, 1))
})

// ─── Toyota Yaris Cross ───────────────────────────────────────────────────────

describe('Toyota Yaris Cross finance', () => {
  const result = parseFinance(load('toyota-yaris-cross.txt'))

  it('deposit ~9840',             () => approx(result.deposit!, 9840, 1))
  it('tan_pct ~6.99',             () => approx(result.tan_pct!, 6.99, 0.01))
  it('taeg_pct ~8.20',            () => approx(result.taeg_pct!, 8.20, 0.01))
  it('monthly_installment ~198',  () => approx(result.monthly_installment!, 198.71, 1))
})

// ─── Renault CAPTUR ───────────────────────────────────────────────────────────

describe('Renault CAPTUR finance', () => {
  const result = parseFinance(load('renautl-captur-hybrid.txt'))

  it('monthly_installment ~176',  () => approx(result.monthly_installment!, 176.36, 1))
  it('deposit ~6050',             () => approx(result.deposit!, 6050, 1))
  it('tan_pct ~0',                () => approx(result.tan_pct!, 0, 0.01))
  it('taeg_pct ~0.88',            () => approx(result.taeg_pct!, 0.88, 0.01))
  it('duration_months is 60',     () => expect(result.duration_months).toBe(60))
  it('residual_value ~8688',      () => approx(result.residual_value!, 8688, 1))
})
