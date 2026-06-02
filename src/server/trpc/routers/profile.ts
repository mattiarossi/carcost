import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { usage_profiles } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const profileFields = z.object({
  name: z.string().min(1),
  km_per_year: z.number().int().default(15000),
  urban_pct: z.number().min(0).max(100).default(30),
  suburban_pct: z.number().min(0).max(100).default(50),
  freeway_pct: z.number().min(0).max(100).default(20),
  fuel_price_eur_per_liter: z.number().default(1.85),
  diesel_price_eur_per_liter: z.number().default(1.70),
  lpg_price_eur_per_liter: z.number().default(0.75),
  cng_price_eur_per_kg: z.number().default(1.10),
  home_kwh_price: z.number().default(0.25),
  public_kwh_price: z.number().default(0.55),
  home_charge_pct: z.number().min(0).max(100).default(80),
  solar_kwh_per_day: z.number().min(0).default(0),
  ownership_years: z.number().int().default(4),
})

export const profileRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(usage_profiles).all()
  ),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(usage_profiles).where(eq(usage_profiles.id, input.id)).get() ?? null
    ),

  create: publicProcedure
    .input(profileFields)
    .mutation(({ ctx, input }) => {
      const id = nanoid()
      ctx.db.insert(usage_profiles).values({ id, ...input }).run()
      return ctx.db.select().from(usage_profiles).where(eq(usage_profiles.id, id)).get()
    }),

  update: publicProcedure
    .input(z.object({ id: z.string() }).merge(profileFields.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      ctx.db.update(usage_profiles).set(rest).where(eq(usage_profiles.id, id)).run()
      return ctx.db.select().from(usage_profiles).where(eq(usage_profiles.id, id)).get()
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(usage_profiles).where(eq(usage_profiles.id, input.id)).run()
      return { ok: true }
    }),

  setDefault: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.update(usage_profiles).set({ is_default: 0 }).run()
      ctx.db.update(usage_profiles).set({ is_default: 1 })
        .where(eq(usage_profiles.id, input.id)).run()
      return { ok: true }
    }),
})
