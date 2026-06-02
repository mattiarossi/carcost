/**
 * Spec-parser regression tests.
 * Each fixture represents a real car configurator page.
 * Add assertions here when you add/fix parser behaviour so regressions are caught immediately.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseSpecs } from '../specParser.js'

const FIXTURES = join(process.cwd(), 'fixtures/configurator/cars')

function load(name: string) {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function approx(actual: number | undefined, expected: number, tolerance = 0.05) {
  expect(actual, `expected ~${expected}`).toBeDefined()
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(tolerance)
}

// ─── Hyundai TUCSON PHEV ─────────────────────────────────────────────────────

describe('Hyundai TUCSON PHEV', () => {
  const result = parseSpecs(load('hiunday-tucson.txt'))

  it('fuel_type is PHEV',              () => expect(result.fuel_type).toBe('PHEV'))
  it('fuel_consumption_combined ~6',   () => approx(result.fuel_consumption_combined, 6))
  it('co2_gkm is 136',                 () => expect(result.co2_gkm).toBe(136))
  it('engine_displacement_cc ~1598',   () => approx(result.engine_displacement_cc!, 1598, 5))
  it('ev_range_km is 89',              () => expect(result.ev_range_km).toBe(89))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
  it('no spurious battery_capacity',   () => expect(result.battery_capacity_kwh).toBeUndefined())
})

// ─── Toyota C-HR BEV ─────────────────────────────────────────────────────────

describe('Toyota C-HR BEV', () => {
  const result = parseSpecs(load('toyota-chr.txt'))

  it('fuel_type is BEV',               () => expect(result.fuel_type).toBe('BEV'))
  it('ev_consumption_combined ~15.7',  () => approx(result.ev_consumption_combined!, 15.7, 0.1))
  it('ev_range_km is 507',             () => expect(result.ev_range_km).toBe(507))
  it('battery_capacity_kwh is 77',     () => expect(result.battery_capacity_kwh).toBe(77))
  it('co2_gkm is 0',                   () => expect(result.co2_gkm).toBe(0))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
})

// ─── Toyota Yaris Cross HEV ──────────────────────────────────────────────────

describe('Toyota Yaris Cross HEV', () => {
  const result = parseSpecs(load('toyota-yaris-cross.txt'))

  it('fuel_type is HEV',               () => expect(result.fuel_type).toBe('HEV'))
  it('fuel_consumption_combined ~4.8', () => approx(result.fuel_consumption_combined!, 4.8, 0.1))
  it('co2_gkm is 109',                 () => expect(result.co2_gkm).toBe(109))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
})

// ─── Volkswagen T-Roc MHEV ───────────────────────────────────────────────────

describe('Volkswagen T-Roc MHEV', () => {
  const result = parseSpecs(load('volkswagen-t-roc.txt'))

  it('fuel_type is MHEV',              () => expect(result.fuel_type).toBe('MHEV'))
  it('fuel_consumption_combined ~5.7', () => approx(result.fuel_consumption_combined!, 5.7, 0.1))
  it('co2_gkm is 130',                 () => expect(result.co2_gkm).toBe(130))
  it('engine_power_kw is 110',         () => expect(result.engine_power_kw).toBe(110))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
})

// ─── Renault CAPTUR HEV ──────────────────────────────────────────────────────

describe('Renault CAPTUR HEV', () => {
  const result = parseSpecs(load('renautl-captur-hybrid.txt'))

  it('fuel_type is HEV',               () => expect(result.fuel_type).toBe('HEV'))
  it('fuel_consumption_combined ~4.4', () => approx(result.fuel_consumption_combined!, 4.4, 0.1))
  it('co2_gkm is 99',                  () => expect(result.co2_gkm).toBe(99))
  it('engine_power_kw is 80',          () => expect(result.engine_power_kw).toBe(80))
  it('engine_power_cv is 160',         () => expect(result.engine_power_cv).toBe(160))
  it('engine_displacement_cc is 1793', () => expect(result.engine_displacement_cc).toBe(1793))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
  it('no spurious battery_capacity',   () => expect(result.battery_capacity_kwh).toBeUndefined())
})
