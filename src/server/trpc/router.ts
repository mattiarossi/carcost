import { router } from './trpc.js'
import { carsRouter } from './routers/cars.js'
import { specsRouter } from './routers/specs.js'
import { financeRouter } from './routers/finance.js'
import { profileRouter } from './routers/profile.js'
import { parseRouter } from './routers/parse.js'
import { metricsRouter } from './routers/metrics.js'

export const appRouter = router({
  cars: carsRouter,
  specs: specsRouter,
  finance: financeRouter,
  profile: profileRouter,
  parse: parseRouter,
  metrics: metricsRouter,
})

export type AppRouter = typeof appRouter
