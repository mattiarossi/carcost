import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

// ---------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------
export const cars = sqliteTable('cars', {
  id: text('id').primaryKey(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  trim: text('trim'),
  year: integer('year'),
  fuel_type: text('fuel_type', {
    enum: ['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'LPG', 'CNG'],
  }).notNull(),
  notes: text('notes'),
  created_at: text('created_at').notNull().default("(strftime('%Y-%m-%dT%H:%M:%SZ','now'))"),
  updated_at: text('updated_at').notNull().default("(strftime('%Y-%m-%dT%H:%M:%SZ','now'))"),
})

// ---------------------------------------------------------------------------
// Car specs (1:1 with cars)
// ---------------------------------------------------------------------------
export const car_specs = sqliteTable('car_specs', {
  car_id: text('car_id').primaryKey().references(() => cars.id, { onDelete: 'cascade' }),
  // Powertrain
  engine_power_cv: real('engine_power_cv'),                    // total system CV
  engine_power_kw: real('engine_power_kw'),                    // total system kW
  engine_power_cv_ice: real('engine_power_cv_ice'),            // ICE-only CV (MHEV/HEV/PHEV)
  engine_power_kw_electric: real('engine_power_kw_electric'),  // electric motor kW
  torque_nm: real('torque_nm'),
  transmission: text('transmission', { enum: ['manual', 'automatic'] }),
  hybrid_architecture: text('hybrid_architecture', {
    enum: ['none', 'P0', 'P1', 'P2', 'P3', 'P4', 'series-parallel'],
  }),
  primary_fuel: text('primary_fuel', { enum: ['petrol', 'diesel', 'lpg', 'cng', 'electric'] }),
  secondary_fuel: text('secondary_fuel', { enum: ['lpg', 'cng', 'electric'] }),
  // ICE / Hybrid consumption (L/100km)
  fuel_consumption_urban: real('fuel_consumption_urban'),
  fuel_consumption_suburban: real('fuel_consumption_suburban'),
  fuel_consumption_combined: real('fuel_consumption_combined'),
  lpg_consumption_combined: real('lpg_consumption_combined'),   // LPG bi-fuel L/100km
  cng_consumption_combined: real('cng_consumption_combined'),   // CNG bi-fuel kg/100km
  // Electric / PHEV
  ev_consumption_combined: real('ev_consumption_combined'),     // kWh/100km
  ev_range_km: real('ev_range_km'),
  battery_capacity_kwh: real('battery_capacity_kwh'),          // gross
  battery_capacity_usable_kwh: real('battery_capacity_usable_kwh'),
  charge_time_ac_h: real('charge_time_ac_h'),
  charge_time_10_80_min: integer('charge_time_10_80_min'),
  max_charge_power_kw: real('max_charge_power_kw'),
  // Emissions
  co2_gkm: real('co2_gkm'),
  co2_gkm_weighted: real('co2_gkm_weighted'),                  // PHEV official weighted
  emission_class: text('emission_class'),
  nox_gkm: real('nox_gkm'),
  // Other
  weight_kg: real('weight_kg'),
  service_cost_per_year: real('service_cost_per_year'),        // nullable, user-entered
  raw_extras: text('raw_extras'),                              // JSON blob
})

// ---------------------------------------------------------------------------
// Car finance options (multiple per car, only one active)
// ---------------------------------------------------------------------------
export const car_finance = sqliteTable('car_finance', {
  id: text('id').primaryKey(),
  car_id: text('car_id').notNull().references(() => cars.id, { onDelete: 'cascade' }),
  is_active: integer('is_active').notNull().default(0),   // 1 = used in comparison
  label: text('label'),
  list_price: real('list_price').notNull(),
  /** Discounted price paid in cash (no financing). Used for TCO. Null = same as list_price. */
  cash_price: real('cash_price'),
  deposit: real('deposit').notNull().default(0),
  n_installments: integer('n_installments'),
  monthly_installment: real('monthly_installment'),
  residual_value: real('residual_value'),                 // VFG / balloon
  duration_months: integer('duration_months'),
  total_financed: real('total_financed'),
  total_repayable: real('total_repayable'),
  tan_pct: real('tan_pct'),
  taeg_pct: real('taeg_pct'),
  annual_km_limit: integer('annual_km_limit'),
  instruction_fees: real('instruction_fees'),             // spese istruttoria
  monthly_fees: real('monthly_fees'),                     // spese incasso/rata
  raw_text: text('raw_text'),                             // original pasted text
  created_at: text('created_at').notNull().default("(strftime('%Y-%m-%dT%H:%M:%SZ','now'))"),
})

// ---------------------------------------------------------------------------
// Usage profiles
// ---------------------------------------------------------------------------
export const usage_profiles = sqliteTable('usage_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  is_default: integer('is_default').notNull().default(0),
  km_per_year: integer('km_per_year').notNull().default(15000),
  urban_pct: real('urban_pct').notNull().default(30),           // percentage 0-100
  suburban_pct: real('suburban_pct').notNull().default(50),
  freeway_pct: real('freeway_pct').notNull().default(20),
  fuel_price_eur_per_liter: real('fuel_price_eur_per_liter').notNull().default(1.85),
  diesel_price_eur_per_liter: real('diesel_price_eur_per_liter').notNull().default(1.70),
  lpg_price_eur_per_liter: real('lpg_price_eur_per_liter').notNull().default(0.75),
  cng_price_eur_per_kg: real('cng_price_eur_per_kg').notNull().default(1.10),
  home_kwh_price: real('home_kwh_price').notNull().default(0.25),
  public_kwh_price: real('public_kwh_price').notNull().default(0.55),
  home_charge_pct: real('home_charge_pct').notNull().default(80),  // percentage 0-100
  solar_kwh_per_day: real('solar_kwh_per_day').notNull().default(0),
  ownership_years: integer('ownership_years').notNull().default(4),
  created_at: text('created_at').notNull().default("(strftime('%Y-%m-%dT%H:%M:%SZ','now'))"),
})

// ---------------------------------------------------------------------------
// Import sessions (parse history)
// ---------------------------------------------------------------------------
export const import_sessions = sqliteTable('import_sessions', {
  id: text('id').primaryKey(),
  car_id: text('car_id').references(() => cars.id, { onDelete: 'set null' }),
  kind: text('kind', { enum: ['specs', 'finance'] }).notNull(),
  raw_text: text('raw_text').notNull(),
  parsed_json: text('parsed_json'),
  fields_applied: text('fields_applied'),   // JSON array of field names merged
  created_at: text('created_at').notNull().default("(strftime('%Y-%m-%dT%H:%M:%SZ','now'))"),
})
