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

// ─── CUPRA Terramar PHEV ─────────────────────────────────────────────────────

describe('CUPRA Terramar PHEV', () => {
  const result = parseSpecs(load('cupra-terramar.txt'))

  it('make is CUPRA',                  () => expect(result.make).toBe('CUPRA'))
  it('model is TERRAMAR',              () => expect(result.model).toBe('TERRAMAR'))
  it('trim is Tribe Edition',          () => expect(result.trim).toBe('Tribe Edition'))
  it('fuel_type is PHEV',              () => expect(result.fuel_type).toBe('PHEV'))
  it('transmission is automatic',      () => expect(result.transmission).toBe('automatic'))
  it('engine_power_kw is 150',         () => expect(result.engine_power_kw).toBe(150))
  it('engine_power_cv is 204',         () => expect(result.engine_power_cv).toBe(204))
  it('top_speed_kmh is 205',           () => expect(result.top_speed_kmh).toBe(205))
  it('torque_nm is 350',               () => expect(result.torque_nm).toBe(350))
  // charge-sustaining combined, not the 1.7 l weighted figure
  it('fuel_consumption_combined ~5.8', () => approx(result.fuel_consumption_combined!, 5.8, 0.1))
  it('ev_consumption_combined ~13.8',  () => approx(result.ev_consumption_combined!, 13.8, 0.1))
  // combined electric range, not the 142/145/117 urban/equivalent variants
  it('ev_range_km is 118',             () => expect(result.ev_range_km).toBe(118))
  it('co2_gkm is 37',                  () => expect(result.co2_gkm).toBe(37))
  it('charge_time_ac_h ~2.5',          () => approx(result.charge_time_ac_h!, 2.5, 0.01))
  it('charge_time_10_80_min is 26',    () => expect(result.charge_time_10_80_min).toBe(26))
})

// ─── CUPRA Raval BEV ─────────────────────────────────────────────────────────

describe('CUPRA Raval BEV', () => {
  const result = parseSpecs(load('cupra-raval.txt'))

  it('make is CUPRA',                  () => expect(result.make).toBe('CUPRA'))
  it('model is RAVAL',                 () => expect(result.model).toBe('RAVAL'))
  it('trim is Launch Edition Plus',    () => expect(result.trim).toBe('Launch Edition Plus'))
  // no "BEV"/"100% elettrico" marker in the text — inferred from absence of ICE wording
  it('fuel_type is BEV',               () => expect(result.fuel_type).toBe('BEV'))
  it('engine_power_cv is 211',         () => expect(result.engine_power_cv).toBe(211))
  it('top_speed_kmh is 160',           () => expect(result.top_speed_kmh).toBe(160))
  it('torque_nm is 290',               () => expect(result.torque_nm).toBe(290))
  it('ev_consumption_combined ~13.9',  () => approx(result.ev_consumption_combined!, 13.9, 0.1))
  // combined range, not the 568 km urban figure
  it('ev_range_km is 438',             () => expect(result.ev_range_km).toBe(438))
  it('co2_gkm is 0',                   () => expect(result.co2_gkm).toBe(0))
  it('charge_time_ac_h ~5.5',          () => approx(result.charge_time_ac_h!, 5.5, 0.01))
  it('charge_time_10_80_min is 24',    () => expect(result.charge_time_10_80_min).toBe(24))
  // battery capacity is genuinely absent from CUPRA spec sheets; metrics fall back
  // to the stated EV consumption, so it must stay undefined rather than be guessed
  it('battery_capacity_kwh undefined', () => expect(result.battery_capacity_kwh).toBeUndefined())
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
