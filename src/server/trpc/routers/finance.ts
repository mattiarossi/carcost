import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { car_finance } from '../../db/schema.js'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const financeFields = z.object({
  label: z.string().optional(),
  list_price: z.number(),
  cash_price: z.number().optional(),
  deposit: z.number().default(0),
  n_installments: z.number().int().optional(),
  monthly_installment: z.number().optional(),
  residual_value: z.number().optional(),
  duration_months: z.number().int().optional(),
  total_financed: z.number().optional(),
  total_repayable: z.number().optional(),
  tan_pct: z.number().optional(),
  taeg_pct: z.number().optional(),
  annual_km_limit: z.number().int().optional(),
  instruction_fees: z.number().optional(),
  monthly_fees: z.number().optional(),
  raw_text: z.string().optional(),
})

export const financeRouter = router({
  list: publicProcedure
    .input(z.object({ carId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(car_finance).where(eq(car_finance.car_id, input.carId)).all()
    ),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(car_finance).where(eq(car_finance.id, input.id)).get() ?? null
    ),

  create: publicProcedure
    .input(z.object({ car_id: z.string() }).merge(financeFields))
    .mutation(({ ctx, input }) => {
      const { car_id, ...rest } = input
      const id = nanoid()
      // Auto-activate the first imported offer: if the car has no active offer
      // yet, make this one active so it's immediately comparable.
      const hasActive = ctx.db.select({ id: car_finance.id })
        .from(car_finance)
        .where(and(eq(car_finance.car_id, car_id), eq(car_finance.is_active, 1)))
        .get()
      const is_active = hasActive ? 0 : 1
      console.log('[finance.create] inserting', { id, car_id, is_active, ...rest })
      try {
        ctx.db.insert(car_finance).values({ id, car_id, is_active, ...rest }).run()
      } catch (e) {
        console.error('[finance.create] DB error', e)
        throw e
      }
      return ctx.db.select().from(car_finance).where(eq(car_finance.id, id)).get()
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().optional(),
      list_price: z.number().optional(),
      cash_price: z.number().optional(),
      deposit: z.number().optional(),
      n_installments: z.number().int().optional(),
      monthly_installment: z.number().optional(),
      residual_value: z.number().optional(),
      duration_months: z.number().int().optional(),
      total_financed: z.number().optional(),
      total_repayable: z.number().optional(),
      tan_pct: z.number().optional(),
      taeg_pct: z.number().optional(),
      annual_km_limit: z.number().int().optional(),
      instruction_fees: z.number().optional(),
      monthly_fees: z.number().optional(),
      raw_text: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input
      ctx.db.update(car_finance).set(rest).where(eq(car_finance.id, id)).run()
      return ctx.db.select().from(car_finance).where(eq(car_finance.id, id)).get()
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(car_finance).where(eq(car_finance.id, input.id)).run()
      return { ok: true }
    }),

  setActive: publicProcedure
    .input(z.object({ id: z.string(), car_id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.update(car_finance).set({ is_active: 0 })
        .where(eq(car_finance.car_id, input.car_id)).run()
      ctx.db.update(car_finance).set({ is_active: 1 })
        .where(eq(car_finance.id, input.id)).run()
      return ctx.db.select().from(car_finance).where(eq(car_finance.id, input.id)).get()
    }),
})
