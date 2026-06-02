// Quick parse test — run with: node --experimental-vm-modules scripts/test-parse.mjs
// Uses the compiled output; run `yarn build` first, or use tsx if available.
// This version imports directly from the TS source via tsx (if installed globally).

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(path.join(__dirname, '../fixtures/configurator/cars/hiunday-tucson.txt'), 'utf8')

// Dynamic import after tsx transform
const { parseSpecs } = await import('../src/server/parsers/specParser.ts')

const result = parseSpecs(fixture)
const { raw_extras, confidence, ...fields } = result

console.log('\n=== Parsed fields ===')
for (const [k, v] of Object.entries(fields)) {
  if (v !== undefined && v !== null) {
    const conf = confidence[k] ?? ''
    console.log(`  ${k.padEnd(35)} ${String(v).padEnd(15)} [${conf}]`)
  }
}

console.log('\n=== Confidence: low / missing ===')
const expected = ['fuel_type','transmission','fuel_consumption_combined','co2_gkm','ev_range_km','engine_power_kw']
for (const k of expected) {
  const val = result[k]
  const conf = confidence[k]
  const status = val !== undefined ? `${val} [${conf}]` : '--- MISSING ---'
  console.log(`  ${k.padEnd(35)} ${status}`)
}

console.log('\n=== Raw extras (unparsed lines) ===')
for (const [k, v] of Object.entries(result.raw_extras ?? {})) {
  console.log(`  ${k}: ${v}`)
}
