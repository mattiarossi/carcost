import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { cars } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const carsRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(cars).all()
  ),

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
