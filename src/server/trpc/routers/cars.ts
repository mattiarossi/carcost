import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { cars, car_finance } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const carsRouter = router({
  // Each row carries `has_active_finance` so the UI can flag cars that can't be
  // compared yet — compareData drops any car without an active finance offer.
  list: publicProcedure.query(({ ctx }) => {
    const rows = ctx.db.select().from(cars).all()
    const active = new Set(
      ctx.db.select({ car_id: car_finance.car_id })
        .from(car_finance)
        .where(eq(car_finance.is_active, 1))
        .all()
        .map(r => r.car_id),
    )
    return rows.map(r => ({ ...r, has_active_finance: active.has(r.id) }))
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(cars).where(eq(cars.id, input.id)).get() ?? null
    ),

  create: publicProcedure
    .input(z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      trim: z.string().optional(),
      year: z.number().int().optional(),
      fuel_type: z.enum(['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'LPG', 'CNG']),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const id = nanoid()
      ctx.db.insert(cars).values({ id, ...input }).run()
      return ctx.db.select().from(cars).where(eq(cars.id, id)).get()
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      make: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      trim: z.string().optional(),
      year: z.number().int().optional(),
      fuel_type: z.enum(['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'LPG', 'CNG']).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      ctx.db.update(cars).set(rest).where(eq(cars.id, id)).run()
      return ctx.db.select().from(cars).where(eq(cars.id, id)).get()
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(cars).where(eq(cars.id, input.id)).run()
      return { ok: true }
    }),

  checkDuplicate: publicProcedure
    .input(z.object({
      make: z.string(),
      model: z.string(),
      trim: z.string().optional(),
      year: z.number().int().optional(),
    }))
    .query(({ ctx, input }) => {
      const rows = ctx.db.select().from(cars)
        .where(eq(cars.make, input.make))
        .all()
      const exact = rows.find(r =>
        r.model.toLowerCase() === input.model.toLowerCase() &&
        (!input.trim || r.trim?.toLowerCase() === input.trim.toLowerCase()) &&
        (!input.year || r.year === input.year)
      ) ?? null
      const similar = rows.filter(r => r !== exact &&
        r.model.toLowerCase().includes(input.model.toLowerCase().slice(0, 4))
      )
      return { exact, similar }
    }),
})
