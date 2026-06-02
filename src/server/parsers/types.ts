export type FuelType = 'ICE' | 'MHEV' | 'HEV' | 'PHEV' | 'BEV' | 'LPG' | 'CNG'
export type Confidence = 'high' | 'low'

export interface ParsedSpecs {
  // Identity
  make?: string
  model?: string
  trim?: string
  year?: number
  // Powertrain
  engine_power_cv?: number
  engine_power_kw?: number
  engine_power_cv_ice?: number
  engine_power_kw_electric?: number
  transmission?: 'manual' | 'automatic'
  fuel_type?: FuelType
  primary_fuel?: 'petrol' | 'diesel' | 'lpg' | 'cng' | 'electric'
  secondary_fuel?: 'lpg' | 'cng' | 'electric' | null
  hybrid_architecture?: 'none' | 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'series-parallel'
  // Consumption
  fuel_consumption_urban?: number
  fuel_consumption_suburban?: number
  fuel_consumption_combined?: number
  lpg_consumption_combined?: number
  cng_consumption_combined?: number
  ev_consumption_combined?: number
  // Electric
  ev_range_km?: number
  battery_capacity_kwh?: number
  battery_capacity_usable_kwh?: number
  charge_time_ac_h?: number
  charge_time_10_80_min?: number
  max_charge_power_kw?: number
  // Emissions / other
  co2_gkm?: number
  co2_gkm_weighted?: number
  emission_class?: string
  nox_gkm?: number
  weight_kg?: number
  torque_nm?: number
  // Performance
  acceleration_0_100_s?: number
  top_speed_kmh?: number
  engine_displacement_cc?: number
  // Unmatched fields from parse
  raw_extras: Record<string, string>
  // Per-field confidence
  confidence: Partial<Record<keyof Omit<ParsedSpecs, 'raw_extras' | 'confidence' | 'missing_fields'>, Confidence>>
  /** Fields that are required for cost calculations but were not found in the pasted text */
  missing_fields?: Array<{ field: string; label: string }>
}

export interface ParsedFinance {
  label?: string
  list_price?: number
  /** Actual price after discounts, paid without financing. Use this for TCO, not list_price. */
  cash_price?: number
  deposit?: number
  n_installments?: number
  monthly_installment?: number
  residual_value?: number
  duration_months?: number
  total_financed?: number
  total_repayable?: number
  tan_pct?: number
  taeg_pct?: number
  annual_km_limit?: number
  instruction_fees?: number
  monthly_fees?: number
  raw_text: string
  raw_extras: Record<string, string>
  confidence: Partial<Record<keyof Omit<ParsedFinance, 'raw_text' | 'raw_extras' | 'confidence'>, Confidence>>
}
