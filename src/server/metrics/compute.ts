/**
 * Pure metrics computation — no DB, no HTTP.
 * All formulas follow Plan B (Computed Metrics section).
 */

// ── Input types ──────────────────────────────────────────────────────────────

export interface CarInput {
  fuel_type: 'ICE' | 'MHEV' | 'HEV' | 'PHEV' | 'BEV' | 'LPG' | 'CNG'
}

export interface SpecsInput {
  primary_fuel?: 'petrol' | 'diesel' | 'lpg' | 'cng' | 'electric' | null
  fuel_consumption_urban?: number | null
  fuel_consumption_suburban?: number | null
  fuel_consumption_combined?: number | null
  lpg_consumption_combined?: number | null
  cng_consumption_combined?: number | null
  ev_consumption_combined?: number | null
  ev_range_km?: number | null
  battery_capacity_kwh?: number | null
  battery_capacity_usable_kwh?: number | null
  co2_gkm?: number | null
  service_cost_per_year?: number | null
}

export interface FinanceInput {
  list_price: number
  /** Actual price after discounts paid in cash (no financing). Falls back to list_price if absent. */
  cash_price?: number | null
  deposit: number
  n_installments?: number | null
  monthly_installment?: number | null
  residual_value?: number | null
  duration_months?: number | null
  instruction_fees?: number | null
  monthly_fees?: number | null
  total_repayable?: number | null
}

export interface ProfileValues {
  km_per_year: number
  urban_pct: number
  suburban_pct: number
  freeway_pct: number
  fuel_price_eur_per_liter: number   // petrol price
  diesel_price_eur_per_liter: number
  lpg_price_eur_per_liter: number
  cng_price_eur_per_kg: number
  home_kwh_price: number
  public_kwh_price: number
  home_charge_pct: number            // 0–100
  solar_kwh_per_day: number
  ownership_years: number
  /** Optional MHEV efficiency bonus override. Default: 0.07 */
  mhev_efficiency_bonus?: number
}

// ── Output type ───────────────────────────────────────────────────────────────

export interface CarMetrics {
  // ── Purchase & Finance ───────────────────────────────────────────────────
  purchase_price: number
  cash_delta: number                  // (deposit + total_repayable) − cash_price (financing premium vs actual cash price)
  financing_premium_pct: number
  monthly_cost_keep: number           // installment + fees + balloon/duration
  monthly_cost_return: number         // installment + fees only
  total_finance_paid: number          // deposit + installments_sum + fees
  residual_value: number

  // ── Running costs (no purchase) ──────────────────────────────────────────
  fuel_cost_annual: number
  energy_cost_annual: number          // electric energy; 0 for ICE/LPG/CNG
  service_cost_annual: number
  running_cost_annual: number         // fuel + energy + service
  running_cost_monthly: number
  running_cost_per_km: number
  running_cost_per_day: number
  running_cost_total: number          // × ownership_years

  // ── TCO ──────────────────────────────────────────────────────────────────
  tco_total: number                   // purchase + running_total − residual
  tco_per_km: number
  tco_per_month: number

  // ── Convenience ──────────────────────────────────────────────────────────
  co2_total_kg: number | null
  financing_cost_per_km: number | null
  range_coverage_pct: number | null   // EV only: ev_range / daily_km × 100

  // ── Debug (intermediate values) ──────────────────────────────────────────
  weighted_consumption_per_100km: number | null
  electric_fraction: number | null
  blended_kwh_price: number | null
  effective_home_price: number | null
  /** ev_consumption used in calculations; may be derived from battery/range when not explicitly measured */
  ev_consumption_used: number | null
  ev_consumption_derived: boolean     // true if derived from battery÷range rather than from spec sheet

  // ── EV energy breakdown (annual kWh, only for PHEV/BEV) ──────────────────
  ev_kwh_annual: number | null           // total EV kWh/year
  ev_kwh_solar_annual: number | null     // covered by PV (cost = 0)
  ev_kwh_grid_home_annual: number | null // from home grid after solar
  ev_kwh_public_annual: number | null    // from public charger
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: number | null | undefined, fallback = 0): number {
  return v ?? fallback
}

/**
 * Weighted fuel consumption (L/100km) blended across driving mix.
 * Falls back to combined if urban/suburban are not available.
 */
function weightedConsumption(specs: SpecsInput, profile: ProfileValues): number {
  const combined = n(specs.fuel_consumption_combined)
  if (!combined) return 0

  const urban    = n(specs.fuel_consumption_urban, combined)
  const suburban = n(specs.fuel_consumption_suburban, combined)

  return (
    urban    * (profile.urban_pct    / 100) +
    suburban * (profile.suburban_pct / 100) +
    combined * (profile.freeway_pct  / 100)
  )
}

/**
 * Solar-aware home charging effective price per kWh.
 * solar_kwh_per_day kWh are free; remainder paid at home_kwh_price.
 */
function effectiveHomePrice(
  dailyEvKwh: number,
  solarKwhPerDay: number,
  homeKwhPrice: number,
): number {
  if (dailyEvKwh <= 0) return homeKwhPrice
  const homeDailyKwh   = dailyEvKwh
  const solarCovered   = Math.min(solarKwhPerDay, homeDailyKwh)
  const gridCovered    = homeDailyKwh - solarCovered
  return (gridCovered * homeKwhPrice) / homeDailyKwh
}

/**
 * Blended kWh price across home and public charging.
 */
function blendedKwhPrice(
  homePrice: number,
  publicPrice: number,
  homeChargePct: number,
): number {
  return (
    homePrice   * (homeChargePct        / 100) +
    publicPrice * ((100 - homeChargePct) / 100)
  )
}

// ── Primary fuel price helper ─────────────────────────────────────────────────

function primaryFuelPrice(specs: SpecsInput, profile: ProfileValues): number {
  if (specs.primary_fuel === 'diesel') return profile.diesel_price_eur_per_liter
  return profile.fuel_price_eur_per_liter
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computeMetrics(
  car: CarInput,
  specs: SpecsInput,
  finance: FinanceInput,
  profile: ProfileValues,
): CarMetrics {
  const MHEV_BONUS = profile.mhev_efficiency_bonus ?? 0.07
  const WORKING_DAYS_PER_YEAR = 250

  // Derive ev_consumption_combined from battery capacity ÷ range if not explicitly provided
  const usableKwh = specs.battery_capacity_usable_kwh ?? specs.battery_capacity_kwh ?? null
  const derivedEvConsumption: number | null =
    specs.ev_consumption_combined != null
      ? specs.ev_consumption_combined
      : usableKwh != null && specs.ev_range_km != null && specs.ev_range_km > 0
        ? (usableKwh / specs.ev_range_km) * 100
        : null
  const specsEv = { ...specs, ev_consumption_combined: derivedEvConsumption }

  // ── Finance ────────────────────────────────────────────────────────────────
  const listPrice       = finance.list_price
  // Use discounted cash price for TCO; fall back to list price if not available
  const cashPrice       = finance.cash_price != null ? finance.cash_price : listPrice
  const deposit         = n(finance.deposit)
  const duration = n(finance.duration_months, profile.ownership_years * 12)
  const instFees = n(finance.instruction_fees)
  const mthFees  = n(finance.monthly_fees)
  const residual = n(finance.residual_value)
  const nInst    = n(finance.n_installments, duration)
  const mthInst  = n(finance.monthly_installment)

  // total_repayable = what goes to the lender (installments + residual, no deposit).
  // Parsed directly from source text ("Totale da rimborsare"); duration is already baked in.
  // Fallback: reconstruct from parsed components if not present in text.
  const totalRepayable  = n(finance.total_repayable, mthInst * nInst + instFees + mthFees * nInst + residual)
  const cashDelta       = deposit + totalRepayable - cashPrice
  const financingPremiumPct = cashPrice > 0 ? (cashDelta / cashPrice) * 100 : 0

  const monthlyKeep   = mthInst + instFees / duration + mthFees + residual / duration
  const monthlyReturn = mthInst + instFees / duration + mthFees

  const totalFinancePaid = deposit + mthInst * nInst + instFees + mthFees * nInst

  // ── Running costs: fuel/energy ─────────────────────────────────────────────
  const kmPerYear         = profile.km_per_year
  const serviceCostAnnual = n(specs.service_cost_per_year)
  let fuelCostAnnual      = 0
  let energyCostAnnual    = 0

  // Debug intermediates (populated per branch)
  let weightedConsumptionPer100km: number | null = null
  let electricFraction: number | null             = null
  let evKwhAnnual: number | null                  = null
  let evKwhSolarAnnual: number | null             = null
  let evKwhGridHomeAnnual: number | null          = null
  let evKwhPublicAnnual: number | null            = null
  let blendedKwhPriceVal: number | null           = null
  let effectiveHomePriceVal: number | null        = null

  switch (car.fuel_type) {
    case 'ICE': {
      const wc = weightedConsumption(specs, profile)
      weightedConsumptionPer100km = wc
      fuelCostAnnual = kmPerYear * (wc / 100) * primaryFuelPrice(specs, profile)
      break
    }

    case 'MHEV': {
      const wc = weightedConsumption(specs, profile) * (1 - MHEV_BONUS)
      weightedConsumptionPer100km = wc
      fuelCostAnnual = kmPerYear * (wc / 100) * primaryFuelPrice(specs, profile)
      break
    }

    case 'HEV': {
      // WLTP figures already embed EV assist; treat like ICE
      const wc = weightedConsumption(specs, profile)
      weightedConsumptionPer100km = wc
      fuelCostAnnual = kmPerYear * (wc / 100) * primaryFuelPrice(specs, profile)
      break
    }

    case 'LPG': {
      // Urban trips on petrol (cold start), rest on LPG
      const petrolFraction = profile.urban_pct / 100
      const lpgFraction    = 1 - petrolFraction
      const lpgCons   = n(specs.lpg_consumption_combined)
      const petrolCons = n(specs.fuel_consumption_combined)
      fuelCostAnnual =
        kmPerYear * (lpgCons   / 100) * lpgFraction    * profile.lpg_price_eur_per_liter +
        kmPerYear * (petrolCons / 100) * petrolFraction * primaryFuelPrice(specs, profile)
      weightedConsumptionPer100km = lpgCons * lpgFraction + petrolCons * petrolFraction
      break
    }

    case 'CNG': {
      const petrolFraction = profile.urban_pct / 100
      const cngFraction    = 1 - petrolFraction
      const cngCons    = n(specs.cng_consumption_combined)
      const petrolCons = n(specs.fuel_consumption_combined)
      fuelCostAnnual =
        kmPerYear * (cngCons   / 100) * cngFraction    * profile.cng_price_eur_per_kg +
        kmPerYear * (petrolCons / 100) * petrolFraction * primaryFuelPrice(specs, profile)
      weightedConsumptionPer100km = cngCons * cngFraction + petrolCons * petrolFraction
      break
    }

    case 'PHEV': {
      const dailyKm       = kmPerYear / WORKING_DAYS_PER_YEAR
      const evRange       = n(specsEv.ev_range_km)
      const evFraction    = evRange > 0 ? Math.min(1, evRange / dailyKm) : 0
      electricFraction    = evFraction

      // Total EV kWh/year needed by the motor
      evKwhAnnual         = kmPerYear * evFraction * (n(specsEv.ev_consumption_combined) / 100)

      // Solar covers total EV demand first (free, at home); the net remainder is
      // then split between home-grid and public by home_charge_pct
      evKwhSolarAnnual    = Math.min(profile.solar_kwh_per_day * 365, evKwhAnnual)
      const netPurchased  = evKwhAnnual - evKwhSolarAnnual
      evKwhGridHomeAnnual = netPurchased * (profile.home_charge_pct / 100)
      evKwhPublicAnnual   = netPurchased * (1 - profile.home_charge_pct / 100)

      energyCostAnnual      = evKwhGridHomeAnnual * profile.home_kwh_price
                            + evKwhPublicAnnual   * profile.public_kwh_price
      blendedKwhPriceVal    = evKwhAnnual > 0 ? energyCostAnnual / evKwhAnnual : 0
      effectiveHomePriceVal = profile.home_kwh_price

      // ICE fuel cost for non-electric km
      const wc = weightedConsumption(specs, profile)
      weightedConsumptionPer100km = wc
      fuelCostAnnual = kmPerYear * (1 - evFraction) * (wc / 100) * primaryFuelPrice(specs, profile)
      break
    }

    case 'BEV': {
      electricFraction    = 1
      evKwhAnnual         = kmPerYear * (n(specsEv.ev_consumption_combined) / 100)

      // Same logic: solar covers total first, remainder split home-grid / public
      evKwhSolarAnnual    = Math.min(profile.solar_kwh_per_day * 365, evKwhAnnual)
      const netPurchased  = evKwhAnnual - evKwhSolarAnnual
      evKwhGridHomeAnnual = netPurchased * (profile.home_charge_pct / 100)
      evKwhPublicAnnual   = netPurchased * (1 - profile.home_charge_pct / 100)

      energyCostAnnual      = evKwhGridHomeAnnual * profile.home_kwh_price
                            + evKwhPublicAnnual   * profile.public_kwh_price
      blendedKwhPriceVal    = evKwhAnnual > 0 ? energyCostAnnual / evKwhAnnual : 0
      effectiveHomePriceVal = profile.home_kwh_price
      break
    }
  }

  // ── Running cost aggregates ────────────────────────────────────────────────
  const runningCostAnnual  = fuelCostAnnual + energyCostAnnual + serviceCostAnnual
  const runningCostMonthly = runningCostAnnual / 12
  const runningCostPerKm   = kmPerYear > 0 ? runningCostAnnual / kmPerYear : 0
  const runningCostPerDay  = runningCostAnnual / 365
  const runningCostTotal   = runningCostAnnual * profile.ownership_years

  // ── TCO ────────────────────────────────────────────────────────────────────
  // Use VFG as residual estimate only if duration ≈ ownership horizon (±6 months)
  const ownershipMonths   = profile.ownership_years * 12
  const durationClose     = Math.abs(duration - ownershipMonths) <= 6
  const residualEstimate  = durationClose ? residual : 0

  // Acquisition cost: if financed, use what actually leaves the buyer's pocket
  // (deposit + total_repayable). If no finance, use list price.
  const hasFinance      = mthInst > 0
  const acquisitionCost = hasFinance ? deposit + totalRepayable : cashPrice

  const tcoTotal   = acquisitionCost + runningCostTotal - residualEstimate
  const totalKm    = kmPerYear * profile.ownership_years
  const tcoPerKm   = totalKm > 0 ? tcoTotal / totalKm : 0
  const tcoPerMonth = profile.ownership_years > 0 ? tcoTotal / (profile.ownership_years * 12) : 0

  // ── Convenience ────────────────────────────────────────────────────────────
  const co2TotalKg = specs.co2_gkm != null
    ? (specs.co2_gkm / 1000) * kmPerYear * profile.ownership_years
    : null

  const durationYears = duration / 12
  const financingCostPerKm = durationYears > 0 && kmPerYear > 0
    ? cashDelta / (kmPerYear * durationYears)
    : null

  const dailyKmEstimate = kmPerYear / WORKING_DAYS_PER_YEAR
  const rangeCoveragePct = specs.ev_range_km != null && specs.ev_range_km > 0
    ? (specs.ev_range_km / dailyKmEstimate) * 100
    : null

  return {
    purchase_price:           cashPrice,
    cash_delta:               cashDelta,
    financing_premium_pct:    financingPremiumPct,
    monthly_cost_keep:        monthlyKeep,
    monthly_cost_return:      monthlyReturn,
    total_finance_paid:       totalFinancePaid,
    residual_value:           residual,

    fuel_cost_annual:         fuelCostAnnual,
    energy_cost_annual:       energyCostAnnual,
    service_cost_annual:      serviceCostAnnual,
    running_cost_annual:      runningCostAnnual,
    running_cost_monthly:     runningCostMonthly,
    running_cost_per_km:      runningCostPerKm,
    running_cost_per_day:     runningCostPerDay,
    running_cost_total:       runningCostTotal,

    tco_total:    tcoTotal,
    tco_per_km:   tcoPerKm,
    tco_per_month: tcoPerMonth,

    co2_total_kg:             co2TotalKg,
    financing_cost_per_km:    financingCostPerKm,
    range_coverage_pct:       rangeCoveragePct,

    weighted_consumption_per_100km: weightedConsumptionPer100km,
    electric_fraction:              electricFraction,
    blended_kwh_price:              blendedKwhPriceVal,
    effective_home_price:           effectiveHomePriceVal,
    ev_consumption_used:            derivedEvConsumption,
    ev_consumption_derived:         specs.ev_consumption_combined == null && derivedEvConsumption != null,

    ev_kwh_annual:                  evKwhAnnual,
    ev_kwh_solar_annual:            evKwhSolarAnnual,
    ev_kwh_grid_home_annual:        evKwhGridHomeAnnual,
    ev_kwh_public_annual:           evKwhPublicAnnual,
  }
}

// ── Sensitivity sweep ─────────────────────────────────────────────────────────

export type SweepVariable =
  | 'petrol_price'
  | 'diesel_price'
  | 'home_kwh_price'
  | 'public_kwh_price'
  | 'lpg_price'
  | 'cng_price'
  | 'km_per_year'
  | 'home_charge_pct'
  | 'ownership_years'
  | 'solar_kwh_per_day'

export interface SensitivityRequest {
  cars: Array<{ id: string; label: string; car: CarInput; specs: SpecsInput; finance: FinanceInput }>
  profile: ProfileValues
  sweepVariable: SweepVariable
  sweepMin: number
  sweepMax: number
  steps: number
  yAxis: 'tco_total' | 'tco_per_km' | 'running_cost_annual'
}

export interface SensitivityResult {
  series: Array<{
    carId: string
    label: string
    points: Array<{ x: number; y: number }>
  }>
  crossovers: Array<{
    carIdA: string
    carIdB: string
    x: number
    y: number
  }>
  currentX: number
}

function currentSweepValue(variable: SweepVariable, profile: ProfileValues): number {
  switch (variable) {
    case 'petrol_price':    return profile.fuel_price_eur_per_liter
    case 'diesel_price':    return profile.diesel_price_eur_per_liter
    case 'home_kwh_price':  return profile.home_kwh_price
    case 'public_kwh_price':return profile.public_kwh_price
    case 'lpg_price':       return profile.lpg_price_eur_per_liter
    case 'cng_price':       return profile.cng_price_eur_per_kg
    case 'km_per_year':        return profile.km_per_year
    case 'home_charge_pct':    return profile.home_charge_pct
    case 'ownership_years':    return profile.ownership_years
    case 'solar_kwh_per_day':  return profile.solar_kwh_per_day
  }
}

function applyOverride(variable: SweepVariable, value: number, profile: ProfileValues): ProfileValues {
  switch (variable) {
    case 'petrol_price':    return { ...profile, fuel_price_eur_per_liter: value }
    case 'diesel_price':    return { ...profile, diesel_price_eur_per_liter: value }
    case 'home_kwh_price':  return { ...profile, home_kwh_price: value }
    case 'public_kwh_price':return { ...profile, public_kwh_price: value }
    case 'lpg_price':       return { ...profile, lpg_price_eur_per_liter: value }
    case 'cng_price':       return { ...profile, cng_price_eur_per_kg: value }
    case 'km_per_year':       return { ...profile, km_per_year: value }
    case 'home_charge_pct':   return { ...profile, home_charge_pct: value }
    case 'ownership_years':   return { ...profile, ownership_years: Math.round(value) }
    case 'solar_kwh_per_day': return { ...profile, solar_kwh_per_day: value }
  }
}

export function computeSensitivity(req: SensitivityRequest): SensitivityResult {
  const { sweepMin, sweepMax, steps, yAxis } = req
  const stepSize = (sweepMax - sweepMin) / Math.max(steps - 1, 1)

  const series = req.cars.map(({ id, label, car, specs, finance }) => {
    const points: Array<{ x: number; y: number }> = []
    for (let i = 0; i < steps; i++) {
      const x = sweepMin + i * stepSize
      const p = applyOverride(req.sweepVariable, x, req.profile)
      const m = computeMetrics(car, specs, finance, p)
      points.push({ x, y: m[yAxis] })
    }
    return { carId: id, label, points }
  })

  // Find crossovers between every pair of series
  const crossovers: SensitivityResult['crossovers'] = []
  for (let a = 0; a < series.length; a++) {
    for (let b = a + 1; b < series.length; b++) {
      const sa = series[a]
      const sb = series[b]
      for (let i = 0; i < sa.points.length - 1; i++) {
        const diffCur  = sa.points[i].y     - sb.points[i].y
        const diffNext = sa.points[i + 1].y - sb.points[i + 1].y
        if (Math.sign(diffCur) !== Math.sign(diffNext) && diffCur !== 0) {
          // Linear interpolation for crossover x
          const t = diffCur / (diffCur - diffNext)
          const cx = sa.points[i].x + t * (sa.points[i + 1].x - sa.points[i].x)
          const cy = sa.points[i].y + t * (sa.points[i + 1].y - sa.points[i].y)
          crossovers.push({ carIdA: sa.carId, carIdB: sb.carId, x: cx, y: cy })
        }
      }
    }
  }

  return {
    series,
    crossovers,
    currentX: currentSweepValue(req.sweepVariable, req.profile),
  }
}
