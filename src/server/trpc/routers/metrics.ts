import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { cars, car_specs, car_finance, usage_profiles } from '../../db/schema.js'
import { eq, and } from 'drizzle-orm'
import {
  computeMetrics,
  computeSensitivity,
  type CarInput,
  type SpecsInput,
  type FinanceInput,
  type ProfileValues,
  type SweepVariable,
} from '../../metrics/compute.js'
import type { DB } from '../../db/index.js'

// ── Zod schema for an inline profile (matches ProfileValues) ─────────────────

const profileValuesSchema = z.object({
  km_per_year: z.number().positive(),
  urban_pct: z.number().min(0).max(100),
  suburban_pct: z.number().min(0).max(100),
  freeway_pct: z.number().min(0).max(100),
  fuel_price_eur_per_liter: z.number().positive(),
  diesel_price_eur_per_liter: z.number().positive(),
  lpg_price_eur_per_liter: z.number().positive(),
  cng_price_eur_per_kg: z.number().positive(),
  home_kwh_price: z.number().positive(),
  public_kwh_price: z.number().positive(),
  home_charge_pct: z.number().min(0).max(100),
  solar_kwh_per_day: z.number().min(0),
  ownership_years: z.number().int().positive(),
  mhev_efficiency_bonus: z.number().min(0).max(0.5).optional(),
})

// ── Helper: fetch car + active finance + specs from DB ───────────────────────

function fetchCarData(
  db: DB,
  carId: string,
) {
  const car = db.select().from(cars).where(eq(cars.id, carId)).get()
  if (!car) return null

  const specs = db.select().from(car_specs).where(eq(car_specs.car_id, carId)).get()

  const finance = db
    .select()
    .from(car_finance)
    .where(and(eq(car_finance.car_id, carId), eq(car_finance.is_active, 1)))
    .get()

  if (!finance) return null

  return { car, specs: specs ?? {}, finance }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const metricsRouter = router({

  /**
   * Compute metrics for one or more cars using an inline profile.
   * Returns a map of carId → CarMetrics.
   */
  compute: publicProcedure
    .input(z.object({
      carIds: z.array(z.string()).min(1),
      profile: profileValuesSchema,
    }))
    .query(({ ctx, input }) => {
      const results: Record<string, ReturnType<typeof computeMetrics>> = {}

      for (const carId of input.carIds) {
        const row = fetchCarData(ctx.db, carId)
        if (!row) continue

        results[carId] = computeMetrics(
          row.car as CarInput,
          row.specs as SpecsInput,
          row.finance as FinanceInput,
          input.profile as ProfileValues,
        )
      }

      return results
    }),

  /**
   * Compute metrics for one car using a saved profile (by profile id).
   * Convenience wrapper that avoids the client having to send all profile fields.
   */
  computeWithSavedProfile: publicProcedure
    .input(z.object({
      carId: z.string(),
      profileId: z.string(),
    }))
    .query(({ ctx, input }) => {
      const row = fetchCarData(ctx.db, input.carId)
      if (!row) return null

      const profile = ctx.db
        .select()
        .from(usage_profiles)
        .where(eq(usage_profiles.id, input.profileId))
        .get()

      if (!profile) return null

      return computeMetrics(
        row.car as CarInput,
        row.specs as SpecsInput,
        row.finance as FinanceInput,
        profile as ProfileValues,
      )
    }),

  /**
   * Full compare data for the compare page:
   * returns car label, key specs, raw finance fields, and computed metrics per car.
   */
  compareData: publicProcedure
    .input(z.object({
      carIds: z.array(z.string()).min(1),
      profile: profileValuesSchema,
    }))
    .query(({ ctx, input }) => {
      const results: Record<string, {
        label: string
        car: { id: string; make: string; model: string; trim: string | null; fuel_type: string }
        specs: {
          engine_power_cv: number | null
          engine_power_kw: number | null
          transmission: string | null
          fuel_consumption_combined: number | null
          ev_consumption_combined: number | null
          ev_range_km: number | null
          co2_gkm: number | null
          emission_class: string | null
        }
        finance_raw: {
          deposit: number
          monthly_installment: number | null
        }
        metrics: ReturnType<typeof computeMetrics>
      }> = {}

      for (const carId of input.carIds) {
        const row = fetchCarData(ctx.db, carId)
        if (!row) continue

        results[carId] = {
          label: `${row.car.make} ${row.car.model}${row.car.trim ? ' ' + row.car.trim : ''}`,
          car: {
            id: row.car.id,
            make: row.car.make,
            model: row.car.model,
            trim: row.car.trim ?? null,
            fuel_type: row.car.fuel_type,
          },
          specs: {
            engine_power_cv:           (row.specs as Record<string, unknown>).engine_power_cv as number | null ?? null,
            engine_power_kw:           (row.specs as Record<string, unknown>).engine_power_kw as number | null ?? null,
            transmission:              (row.specs as Record<string, unknown>).transmission as string | null ?? null,
            fuel_consumption_combined: row.specs.fuel_consumption_combined ?? null,
            ev_consumption_combined:   row.specs.ev_consumption_combined ?? null,
            ev_range_km:               row.specs.ev_range_km ?? null,
            co2_gkm:                   row.specs.co2_gkm ?? null,
            emission_class:            (row.specs as Record<string, unknown>).emission_class as string | null ?? null,
          },
          finance_raw: {
            deposit:              row.finance.deposit,
            monthly_installment:  row.finance.monthly_installment ?? null,
          },
          metrics: computeMetrics(
            row.car as CarInput,
            row.specs as SpecsInput,
            row.finance as FinanceInput,
            input.profile as ProfileValues,
          ),
        }
      }

      return results
    }),

  /**
   * Sensitivity sweep: vary one price variable across a range,
   * compute tco/running_cost at each point for each car.
   */
  sensitivity: publicProcedure
    .input(z.object({
      carIds: z.array(z.string()).min(1),
      profile: profileValuesSchema,
      sweepVariable: z.enum([
        'petrol_price',
        'diesel_price',
        'home_kwh_price',
        'public_kwh_price',
        'lpg_price',
        'cng_price',
        'km_per_year',
        'home_charge_pct',
        'ownership_years',
        'solar_kwh_per_day',
      ]),
      sweepMin: z.number(),
      sweepMax: z.number(),
      steps: z.number().int().min(2).max(200).default(40),
      yAxis: z.enum(['tco_total', 'tco_per_km', 'running_cost_annual']).default('tco_total'),
    }))
    .query(({ ctx, input }) => {
      const carEntries: Parameters<typeof computeSensitivity>[0]['cars'] = []

      for (const carId of input.carIds) {
        const row = fetchCarData(ctx.db, carId)
        if (!row) continue
        const label = `${row.car.make} ${row.car.model}${row.car.trim ? ' ' + row.car.trim : ''}`
        carEntries.push({
          id: carId,
          label,
          car: row.car as CarInput,
          specs: row.specs as SpecsInput,
          finance: row.finance as FinanceInput,
        })
      }

      if (carEntries.length === 0) return null

      return computeSensitivity({
        cars: carEntries,
        profile: input.profile as ProfileValues,
        sweepVariable: input.sweepVariable as SweepVariable,
        sweepMin: input.sweepMin,
        sweepMax: input.sweepMax,
        steps: input.steps,
        yAxis: input.yAxis,
      })
    }),
})
