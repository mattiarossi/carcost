/**
 * Runs Drizzle migrations at startup so the DB is always up to date.
 * Called once from the vite-trpc-plugin before the first request.
 */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db/index.js'
import { resolve } from 'node:path'

const migrationsFolder = resolve(process.cwd(), 'src/server/db/migrations')

export function runMigrations() {
  console.log('[migrate] running migrations from', migrationsFolder)
  try {
    migrate(db, { migrationsFolder })
    console.log('[migrate] ✓ done')
  } catch (e) {
    console.error('[migrate] ✗ failed:', e)
    throw e
  }
}
