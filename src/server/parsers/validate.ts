import type { FuelType, ParsedSpecs } from './types.js'

// ── Required field descriptors ─────────────────────────────────────────────

interface RequiredField {
  /** Key(s) in ParsedSpecs — if ANY is present the requirement is satisfied */
  fields: Array<keyof ParsedSpecs>
  /** Human-readable label shown in UI warnings */
  label: string
}

/** Fields every car needs for identity + basic cost calculation */
const COMMON_REQUIRED: RequiredField[] = [
  { fields: ['make'],           label: 'Make' },
  { fields: ['model'],          label: 'Model' },
  { fields: ['fuel_type'],      label: 'Fuel type' },
  { fields: ['engine_power_cv', 'engine_power_kw'], label: 'Engine power' },
  { fields: ['co2_gkm'],        label: 'CO₂ emissions (g/km)' },
]

/** Extra required fields per fuel type */
const FUEL_REQUIRED: Record<FuelType, RequiredField[]> = {
  ICE: [
    { fields: ['fuel_consumption_combined'],  label: 'Fuel consumption (combined, l/100km)' },
    { fields: ['engine_displacement_cc'],     label: 'Engine displacement (cc)' },
  ],
  MHEV: [
    { fields: ['fuel_consumption_combined'],  label: 'Fuel consumption (combined, l/100km)' },
    { fields: ['engine_displacement_cc'],     label: 'Engine displacement (cc)' },
  ],
  HEV: [
    { fields: ['fuel_consumption_combined'],  label: 'Fuel consumption (combined, l/100km)' },
  ],
  PHEV: [
    { fields: ['fuel_consumption_combined'],  label: 'Fuel consumption (combined, l/100km)' },
    { fields: ['ev_range_km'],                label: 'Electric range (km, WLTP)' },
    { fields: ['battery_capacity_kwh', 'battery_capacity_usable_kwh'],
                                              label: 'Battery capacity (kWh)' },
  ],
  BEV: [
    { fields: ['ev_range_km'],                label: 'Electric range (km, WLTP)' },
    { fields: ['battery_capacity_kwh', 'battery_capacity_usable_kwh'],
                                              label: 'Battery capacity (kWh)' },
    { fields: ['ev_consumption_combined'],    label: 'EV consumption (kWh/100km)' },
  ],
  LPG: [
    { fields: ['fuel_consumption_combined', 'lpg_consumption_combined'],
                                              label: 'Fuel consumption (combined)' },
  ],
  CNG: [
    { fields: ['fuel_consumption_combined', 'cng_consumption_combined'],
                                              label: 'Fuel consumption (combined)' },
  ],
}

/** Returns human-readable descriptions of missing required fields */
export function validateParsedSpecs(
  specs: ParsedSpecs,
): Array<{ field: string; label: string }> {
  const missing: Array<{ field: string; label: string }> = []

  const check = (req: RequiredField) => {
    const present = req.fields.some(f => {
      const v = specs[f]
      return v !== undefined && v !== null
    })
    if (!present) {
      missing.push({ field: req.fields[0] as string, label: req.label })
    }
  }

  COMMON_REQUIRED.forEach(check)

  if (specs.fuel_type && FUEL_REQUIRED[specs.fuel_type]) {
    FUEL_REQUIRED[specs.fuel_type].forEach(check)
  }

  return missing
}
