import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'
import { db } from '../db/index.js'

export interface Context {
  db: typeof db
}

export function createContext(_opts: CreateWSSContextFnOptions): Context {
  return { db }
}
