import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { car_specs } from '../../db/schema.js'
import { eq } from 'drizzle-orm'

const specsFields = z.object({
  engine_power_cv: z.number().optional(),
  engine_power_kw: z.number().optional(),
  engine_power_cv_ice: z.number().optional(),
  engine_power_kw_electric: z.number().optional(),
  torque_nm: z.number().optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  hybrid_architecture: z.enum(['none', 'P0', 'P1', 'P2', 'P3', 'P4', 'series-parallel']).optional(),
  primary_fuel: z.enum(['petrol', 'diesel', 'lpg', 'cng', 'electric']).optional(),
  secondary_fuel: z.enum(['lpg', 'cng', 'electric']).optional().nullable(),
  fuel_consumption_urban: z.number().optional(),
  fuel_consumption_suburban: z.number().optional(),
  fuel_consumption_combined: z.number().optional(),
  lpg_consumption_combined: z.number().optional(),
  cng_consumption_combined: z.number().optional(),
  ev_consumption_combined: z.number().optional(),
  ev_range_km: z.number().optional(),
  battery_capacity_kwh: z.number().optional(),
  battery_capacity_usable_kwh: z.number().optional(),
  charge_time_ac_h: z.number().optional(),
  charge_time_10_80_min: z.number().int().optional(),
  max_charge_power_kw: z.number().optional(),
  co2_gkm: z.number().optional(),
  co2_gkm_weighted: z.number().optional(),
  emission_class: z.string().optional(),
  nox_gkm: z.number().optional(),
  weight_kg: z.number().optional(),
  service_cost_per_year: z.number().optional(),
  raw_extras: z.string().optional(),
})

export const specsRouter = router({
  get: publicProcedure
    .input(z.object({ carId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(car_specs).where(eq(car_specs.car_id, input.carId)).get() ?? null
    ),

  upsert: publicProcedure
    .input(z.object({ car_id: z.string() }).merge(specsFields))
    .mutation(({ ctx, input }) => {
      const { car_id, ...fields } = input
      // Strip undefined and NaN values so we only write what was validly provided
      const clean = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined && !(typeof v === 'number' && isNaN(v)))
      )
      const existing = ctx.db.select().from(car_specs).where(eq(car_specs.car_id, car_id)).get()
      if (existing) {
        ctx.db.update(car_specs).set(clean).where(eq(car_specs.car_id, car_id)).run()
      } else {
        ctx.db.insert(car_specs).values({ car_id, ...clean }).run()
      }
      return ctx.db.select().from(car_specs).where(eq(car_specs.car_id, car_id)).get()
    }),
})

