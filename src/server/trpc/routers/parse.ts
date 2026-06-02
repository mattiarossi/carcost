import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { validateParsedSpecs } from '../../parsers/validate.js'
import * as registry from '../../parsers/registry.js'

export const parseRouter = router({
  /** Fast detect — call on paste (debounced) to show the "Detected: X" pill. */
  detect: publicProcedure
    .input(z.object({
      text: z.string().min(1),
      type: z.enum(['specs', 'finance']),
    }))
    .query(({ input }) => registry.detect(input.text, input.type)),

  specs: publicProcedure
    .input(z.object({
      text:     z.string().min(1),
      pluginId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { result, usedPlugin, alternatives } = registry.parseSpecs(input.text, input.pluginId)
      result.missing_fields = validateParsedSpecs(result)
      return { ...result, _pluginId: usedPlugin, _alternatives: alternatives }
    }),

  finance: publicProcedure
    .input(z.object({
      text:     z.string().min(1),
      pluginId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { result, usedPlugin, alternatives } = registry.parseFinance(input.text, input.pluginId)
      return { ...result, _pluginId: usedPlugin, _alternatives: alternatives }
    }),
})
