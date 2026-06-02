import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useTRPC, useTRPCClient } from '~/client/lib/trpc'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { KVTable } from '~/client/lib/KVTable'
import { PdfDropZone } from '~/client/components/PdfDropZone'
import type { ParsedSpecs, FuelType } from '~/server/parsers/types'
import type { DetectionResult } from '~/server/parsers/plugin'

export const Route = createFileRoute('/cars/add')({
  component: AddCarPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

interface Identity {
  make: string
  model: string
  trim: string
  year: string
}

interface DuplicateResult {
  exact: { id: string; make: string; model: string; trim: string | null; year: number | null } | null
  similar: Array<{ id: string; make: string; model: string; trim: string | null; year: number | null }>
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfBadge({ conf }: { conf: 'high' | 'low' | undefined }) {
  if (!conf) return null
  return (
    <span
      className="badge"
      style={{
        background: conf === 'high' ? 'oklch(0.95 0.05 145)' : 'oklch(0.96 0.07 75)',
        color: conf === 'high' ? 'oklch(0.38 0.12 145)' : 'oklch(0.44 0.12 75)',
        fontSize: '0.65rem',
        marginLeft: '0.35rem',
      }}
    >
      {conf}
    </span>
  )
}

// ── Parsed specs preview table ────────────────────────────────────────────────

const SPEC_LABELS: Partial<Record<keyof ParsedSpecs, string>> = {
  fuel_type: 'Fuel type',
  engine_power_cv: 'Power (CV)',
  engine_power_kw: 'Power (kW)',
  engine_power_kw_electric: 'Electric motor (kW)',
  torque_nm: 'Torque (Nm)',
  transmission: 'Transmission',
  hybrid_architecture: 'Hybrid arch.',
  fuel_consumption_urban: 'Consumption urban (L/100km)',
  fuel_consumption_suburban: 'Consumption suburban (L/100km)',
  fuel_consumption_combined: 'Consumption combined (L/100km)',
  lpg_consumption_combined: 'LPG consumption (L/100km)',
  cng_consumption_combined: 'CNG consumption (kg/100km)',
  ev_consumption_combined: 'EV consumption (kWh/100km)',
  ev_range_km: 'EV range (km)',
  battery_capacity_kwh: 'Battery gross (kWh)',
  battery_capacity_usable_kwh: 'Battery usable (kWh)',
  max_charge_power_kw: 'Max charge power (kW)',
  charge_time_ac_h: 'Charge time AC (h)',
  charge_time_10_80_min: 'Fast charge 10→80% (min)',
  co2_gkm: 'CO₂ (g/km)',
  co2_gkm_weighted: 'CO₂ weighted PHEV (g/km)',
  emission_class: 'Emission class',
  nox_gkm: 'NOx (g/km)',
  weight_kg: 'Weight (kg)',
  acceleration_0_100_s: '0–100 km/h (s)',
  top_speed_kmh: 'Top speed (km/h)',
  engine_displacement_cc: 'Displacement (cc)',
}

type Overrides = Partial<Record<string, number | string>>

function SpecsPreview({
  parsed,
  overrides,
  onOverride,
}: {
  parsed: ParsedSpecs
  overrides: Overrides
  onOverride: (field: string, value: number | string) => void
}) {
  const fields = Object.entries(SPEC_LABELS) as Array<[keyof ParsedSpecs, string]>
  const populated = fields.filter(([k]) => parsed[k] !== undefined && k !== 'raw_extras' && k !== 'confidence' && k !== 'missing_fields')

  const extras = Object.entries(parsed.raw_extras ?? {})
  const missing = parsed.missing_fields ?? []

  return (
    <div className="space-y-4">
      {/* Missing required fields — inline entry */}
      {missing.length > 0 && (
        <div className="rounded-lg border px-4 py-3 space-y-3"
          style={{ borderColor: 'oklch(0.82 0.12 60)', background: 'oklch(0.97 0.04 60)' }}>
          <p className="text-sm font-semibold" style={{ color: 'oklch(0.45 0.14 50)' }}>
            ⚠ {missing.length} required field{missing.length > 1 ? 's' : ''} not found — please enter {missing.length > 1 ? 'them' : 'it'} below
          </p>
          <div className="grid grid-cols-1 gap-2">
            {missing.map(m => (
              <label key={m.field} className="flex items-center gap-3 text-sm">
                <span className="w-64 shrink-0" style={{ color: 'oklch(0.45 0.10 50)' }}>{m.label}</span>
                <input
                  type="number"
                  step="any"
                  className="input w-32 text-sm"
                  value={overrides[m.field] ?? ''}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    if (!isNaN(n)) onOverride(m.field, n)
                    else if (e.target.value === '') onOverride(m.field, '')
                  }}
                  placeholder="—"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Matched fields */}
      <KVTable
        rows={populated.map(([key, label]) => ({
          label,
          value: (
            <>
              {String(parsed[key])}
              <ConfBadge conf={parsed.confidence?.[key as keyof typeof parsed.confidence]} />
            </>
          ),
        }))}
      />

      {/* Unrecognised fields */}
      {extras.length > 0 && (
        <details>
          <summary className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
            {extras.length} unrecognised field{extras.length > 1 ? 's' : ''} (stored in raw_extras)
          </summary>
          <div className="mt-2">
            <KVTable rows={extras.map(([k, v]) => ({ label: k, value: v }))} size="xs" />
          </div>
        </details>
      )}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation()
  const steps = [
    t('add.step1Label'),
    t('add.step2Label'),
    t('add.step3Label'),
    t('add.step4Label'),
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as Step
        const done = current > n
        const active = current === n
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: done
                    ? 'oklch(0.70 0.14 145)'
                    : active
                    ? 'var(--color-primary-600)'
                    : 'var(--color-surface-subtle)',
                  color: done || active ? 'white' : 'var(--color-text-muted)',
                  border: active ? '2px solid var(--color-primary-700)' : 'none',
                }}
              >
                {done ? '✓' : n}
              </div>
              <span
                className="text-sm hidden sm:inline"
                style={{ color: active ? 'var(--color-text)' : 'var(--color-text-muted)' }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-3 flex-1"
                style={{
                  height: 1,
                  width: '2rem',
                  background: done ? 'oklch(0.70 0.14 145)' : 'var(--color-border)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Identity form ─────────────────────────────────────────────────────────────
// Rendered inline in AddCarPage using the identityForm instance passed in as prop.

function IdentityFormFields({ form }: {
  form: ReturnType<typeof useForm<Identity>>
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-4">
      {(['make', 'model', 'trim', 'year'] as const).map((field) => (
        <div key={field} className={field === 'trim' ? 'col-span-2' : ''}>
          <label className="label">{t(`add.identity.${field}`)}</label>
          <form.Field name={field}>
            {(f) => (
              <input
                className="input"
                value={f.state.value}
                onChange={(e) => f.handleChange(e.target.value)}
                placeholder={t(`add.identity.${field}Placeholder`)}
              />
            )}
          </form.Field>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AddCarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const trpc = useTRPCClient()
  const trpcQuery = useTRPC()
  const queryClient = useQueryClient()
  console.log('[add] AddCarPage mounted')

  const identityForm = useForm<Identity>({
    defaultValues: { make: '', model: '', trim: '', year: '' },
    onSubmit: async () => {},
  })
  const identityValues = useStore(identityForm.store, s => s.values)

  const [step, setStep] = useState<Step>(1)
  const [inputMode, setInputMode] = useState<'paste' | 'manual'>('paste')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedSpecs | null>(null)
  const [manualCar, setManualCar] = useState({
    fuel_type: 'ICE' as FuelType,
    primary_fuel: 'petrol' as 'petrol' | 'diesel',
    fuel_consumption_combined: '',
    ev_consumption_combined: '',
    ev_range_km: '',
    battery_capacity_usable_kwh: '',
    lpg_consumption_combined: '',
    cng_consumption_combined: '',
    co2_gkm: '',
    engine_power_cv: '',
  })
  const [manualOverrides, setManualOverrides] = useState<Overrides>({})
  const [duplicate, setDuplicate] = useState<DuplicateResult | null>(null)
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detections, setDetections] = useState<DetectionResult[]>([])
  const [pluginOverride, setPluginOverride] = useState<string | null>(null)
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced auto-detect on paste text change
  useEffect(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current)
    if (rawText.trim().length < 50) { setDetections([]); return }
    detectTimerRef.current = setTimeout(async () => {
      try {
        const results = await trpc.parse.detect.query({ text: rawText, type: 'specs' })
        setDetections(results)
      } catch { /* silent */ }
    }, 600)
    return () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current) }
  }, [rawText, trpc])

  const handleOverride = useCallback((field: string, value: number | string) => {
    setManualOverrides(prev => ({ ...prev, [field]: value }))
  }, [])

  // Step 1 → parse
  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return
    setParsing(true)
    setError(null)
    try {
      console.log('[add] calling parse.specs')
      const result = await trpc.parse.specs.mutate({ text: rawText, pluginId: pluginOverride ?? undefined })
      console.log('[add] parse.specs result', result)
      setParsed(result)
      setManualOverrides({})
      identityForm.setFieldValue('make', result.make ?? '')
      identityForm.setFieldValue('model', result.model ?? '')
      identityForm.setFieldValue('trim', result.trim ?? '')
      identityForm.setFieldValue('year', result.year ? String(result.year) : '')
      setStep(2)
    } catch (e) {
      console.error('[add] parse.specs error', e)
      setError(t('common.error'))
    } finally {
      setParsing(false)
    }
  }, [rawText, pluginOverride, trpc, t])

  // Manual entry — build synthetic ParsedSpecs and jump to duplicate check
  const handleManualContinue = useCallback(async () => {
    const ft = manualCar.fuel_type
    const p = (s: string): number | undefined => { const n = parseFloat(s); return isNaN(n) ? undefined : n }
    const synth: ParsedSpecs = {
      fuel_type: ft,
      primary_fuel: ['ICE','MHEV','HEV','PHEV'].includes(ft)
        ? manualCar.primary_fuel
        : ft === 'LPG' ? 'lpg' : ft === 'CNG' ? 'cng' : 'electric',
      fuel_consumption_combined: p(manualCar.fuel_consumption_combined),
      ev_consumption_combined: p(manualCar.ev_consumption_combined),
      ev_range_km: p(manualCar.ev_range_km),
      battery_capacity_usable_kwh: p(manualCar.battery_capacity_usable_kwh),
      lpg_consumption_combined: p(manualCar.lpg_consumption_combined),
      cng_consumption_combined: p(manualCar.cng_consumption_combined),
      co2_gkm: p(manualCar.co2_gkm),
      engine_power_cv: p(manualCar.engine_power_cv),
      missing_fields: [],
      raw_extras: {},
      confidence: {},
    }
    const { make, model, trim, year } = identityForm.state.values
    if (!make || !model) { setError(t('add.errors.makeModelRequired')); return }
    setParsed(synth)
    setManualOverrides({})
    setError(null)
    try {
      const result = await trpc.cars.checkDuplicate.query({
        make, model,
        trim: trim || undefined,
        year: year ? parseInt(year, 10) : undefined,
      })
      setDuplicate(result)
      setDismissedDuplicate(false)
      setStep(3)
    } catch {
      setError(t('common.error'))
    }
  }, [manualCar, identityForm, trpc, t])
  const handleIdentityNext = useCallback(async () => {
    const { make, model, trim, year } = identityForm.state.values
    if (!make || !model) {
      setError(t('add.errors.makeModelRequired'))
      return
    }
    setError(null)
    try {
      const result = await trpc.cars.checkDuplicate.query({
        make,
        model,
        trim: trim || undefined,
        year: year ? parseInt(year, 10) : undefined,
      })
      setDuplicate(result)
      setDismissedDuplicate(false)
      setStep(3)
    } catch (e) {
      setError(t('common.error'))
    }
  }, [identityForm, trpc, t])

  // Step 3 → save
  const handleSave = useCallback(async () => {
    if (!parsed) return
    setSaving(true)
    setError(null)
    try {
      // Merge manual overrides into parsed before saving
      const effectiveParsed = { ...parsed } as Record<string, unknown>
      for (const [k, v] of Object.entries(manualOverrides)) {
        if (v !== '' && v !== undefined) effectiveParsed[k] = v
      }
      const p = effectiveParsed as typeof parsed
      const fuelType = p.fuel_type ?? 'ICE'
      // strip NaN/undefined from numeric fields
      const n = (v: number | null | undefined) =>
        v === undefined || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : v
      const { make, model, trim, year } = identityForm.state.values
      console.log('[save] step 1 — cars.create', { make, model, trim, year, fuelType })
      const car = await trpc.cars.create.mutate({
        make,
        model,
        trim: trim || undefined,
        year: year ? parseInt(year, 10) : undefined,
        fuel_type: fuelType,
      })
      console.log('[save] cars.create ok', car)
      if (!car) throw new Error('create failed')

      const specsPayload = {
        car_id: car.id,
        engine_power_cv: n(p.engine_power_cv),
        engine_power_kw: n(p.engine_power_kw),
        engine_power_cv_ice: n(p.engine_power_cv_ice),
        engine_power_kw_electric: n(p.engine_power_kw_electric),
        transmission: p.transmission,
        hybrid_architecture: p.hybrid_architecture,
        primary_fuel: p.primary_fuel,
        secondary_fuel: p.secondary_fuel,
        fuel_consumption_urban: n(p.fuel_consumption_urban),
        fuel_consumption_suburban: n(p.fuel_consumption_suburban),
        fuel_consumption_combined: n(p.fuel_consumption_combined),
        lpg_consumption_combined: n(p.lpg_consumption_combined),
        cng_consumption_combined: n(p.cng_consumption_combined),
        ev_consumption_combined: n(p.ev_consumption_combined),
        ev_range_km: n(p.ev_range_km),
        battery_capacity_kwh: n(p.battery_capacity_kwh),
        battery_capacity_usable_kwh: n(p.battery_capacity_usable_kwh),
        charge_time_ac_h: n(p.charge_time_ac_h),
        charge_time_10_80_min: n(p.charge_time_10_80_min),
        max_charge_power_kw: n(p.max_charge_power_kw),
        co2_gkm: n(p.co2_gkm),
        co2_gkm_weighted: n(p.co2_gkm_weighted),
        emission_class: p.emission_class,
        nox_gkm: n(p.nox_gkm),
        weight_kg: n(p.weight_kg),
        torque_nm: n(p.torque_nm),
        raw_extras: JSON.stringify(p.raw_extras ?? {}),
      }
      console.log('[save] step 2 — specs.upsert', specsPayload)
      await trpc.specs.upsert.mutate(specsPayload)
      console.log('[save] specs.upsert ok')

      console.log('[save] step 3 — invalidate + navigate to', car.id)
      await queryClient.invalidateQueries({ queryKey: trpcQuery.cars.list.queryKey() })
      navigate({ to: '/cars/$carId', params: { carId: car.id } })
    } catch (e) {
      console.error('[save] FAILED', e)
      setError(t('common.error'))
      setSaving(false)
    }
  }, [parsed, manualOverrides, identityForm, trpc, trpcQuery, queryClient, navigate, t])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 style={{ color: 'var(--color-text)' }}>{t('add.title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('add.subtitle')}</p>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="card" style={{ borderColor: 'oklch(0.70 0.18 25)', background: 'oklch(0.97 0.03 25)' }}>
          <p className="text-sm" style={{ color: 'oklch(0.44 0.18 25)' }}>{error}</p>
        </div>
      )}

      {/* ── Step 1: paste or manual ───────────────────────────────────────── */}
      {step === 1 && (
        <div className="card space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: 'var(--color-surface-subtle)' }}>
            {(['paste', 'manual'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: inputMode === mode ? 'var(--color-primary-600)' : 'transparent',
                  color: inputMode === mode ? 'white' : 'var(--color-text)',
                }}
              >
                {mode === 'paste' ? t('add.manual.configuratorText') : t('add.manual.manualEntry')}
              </button>
            ))}
          </div>

          {inputMode === 'paste' ? (
            <>
              <div>
                <label className="label">{t('add.pasteLabel')}</label>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('add.pasteHint')}</p>
                <PdfDropZone onText={setRawText}>
                  <textarea
                    className="input font-mono"
                    rows={12}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={t('add.pastePlaceholder')}
                    style={{ resize: 'vertical' }}
                  />
                </PdfDropZone>
              </div>
              {/* Detection pill */}
              {detections.length > 0 && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {t('add.detectedPlugin', { name: detections[0].displayName })}
                    {detections[0].score < 0.4 ? ' (low confidence)' : ''}
                  </span>
                  {detections.length > 1 && (
                    <select
                      className="input"
                      style={{ width: 'auto', padding: '2px 6px', fontSize: '0.75rem' }}
                      value={pluginOverride ?? detections[0].pluginId}
                      onChange={e => setPluginOverride(e.target.value === detections[0].pluginId && !pluginOverride ? null : e.target.value)}
                      title={t('add.pluginOverrideHint')}
                    >
                      {detections.map(d => (
                        <option key={d.pluginId} value={d.pluginId}>{d.displayName} ({Math.round(d.score * 100)}%)</option>
                      ))}
                    </select>
                  )}
                  {pluginOverride && (
                    <button
                      className="text-xs underline"
                      style={{ color: 'var(--color-primary-600)' }}
                      onClick={() => setPluginOverride(null)}
                    >
                      reset
                    </button>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button className="btn-primary" onClick={handleParse} disabled={!rawText.trim() || parsing}>
                  {parsing ? t('common.loading') : t('add.parseButton')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Identity */}
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('add.manual.carIdentity')}</p>
                <IdentityFormFields form={identityForm} />
              </div>

              {/* Fuel type */}
              <div>
                <label className="label">{t('add.manual.fuelType')}</label>
                <select
                  className="input"
                  value={manualCar.fuel_type}
                  onChange={e => setManualCar(m => ({ ...m, fuel_type: e.target.value as FuelType }))}
                >
                  <option value="ICE">{t('add.manual.ice')}</option>
                  <option value="MHEV">{t('add.manual.mhev')}</option>
                  <option value="HEV">{t('add.manual.hev')}</option>
                  <option value="PHEV">{t('add.manual.phev')}</option>
                  <option value="BEV">{t('add.manual.bev')}</option>
                  <option value="LPG">{t('add.manual.lpg')}</option>
                  <option value="CNG">{t('add.manual.cng')}</option>
                </select>
              </div>

              {/* Fuel-type-dependent consumption fields */}
              <div className="grid grid-cols-2 gap-4">
                {(['ICE','MHEV','HEV','PHEV'] as FuelType[]).includes(manualCar.fuel_type) && (<>
                  <div>
                    <label className="label">{t('add.manual.primaryFuel')}</label>
                    <select className="input" value={manualCar.primary_fuel}
                      onChange={e => setManualCar(m => ({ ...m, primary_fuel: e.target.value as 'petrol'|'diesel' }))}>
                      <option value="petrol">{t('add.manual.petrol')}</option>
                      <option value="diesel">{t('add.manual.diesel')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('add.manual.fuelConsumption')}</label>
                    <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 6.5"
                      value={manualCar.fuel_consumption_combined}
                      onChange={e => setManualCar(m => ({ ...m, fuel_consumption_combined: e.target.value }))} />
                  </div>
                </>)}
                {(['PHEV','BEV'] as FuelType[]).includes(manualCar.fuel_type) && (<>
                  <div>
                    <label className="label">{t('add.manual.evConsumption')}</label>
                    <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 17.0"
                      value={manualCar.ev_consumption_combined}
                      onChange={e => setManualCar(m => ({ ...m, ev_consumption_combined: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('add.manual.batteryUsable')}</label>
                    <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 63.0"
                      value={manualCar.battery_capacity_usable_kwh}
                      onChange={e => setManualCar(m => ({ ...m, battery_capacity_usable_kwh: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('add.manual.evRange')}</label>
                    <input className="input" type="number" step="1" min="0" placeholder="e.g. 400"
                      value={manualCar.ev_range_km}
                      onChange={e => setManualCar(m => ({ ...m, ev_range_km: e.target.value }))} />
                  </div>
                </>)}
                {manualCar.fuel_type === 'LPG' && (
                  <div>
                    <label className="label">{t('add.manual.lpgConsumption')}</label>
                    <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 8.0"
                      value={manualCar.lpg_consumption_combined}
                      onChange={e => setManualCar(m => ({ ...m, lpg_consumption_combined: e.target.value }))} />
                  </div>
                )}
                {manualCar.fuel_type === 'CNG' && (
                  <div>
                    <label className="label">{t('add.manual.cngConsumption')}</label>
                    <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 3.5"
                      value={manualCar.cng_consumption_combined}
                      onChange={e => setManualCar(m => ({ ...m, cng_consumption_combined: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="label">{t('add.manual.co2')} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t('add.manual.optional')}</span></label>
                  <input className="input" type="number" step="1" min="0" placeholder="e.g. 99"
                    value={manualCar.co2_gkm}
                    onChange={e => setManualCar(m => ({ ...m, co2_gkm: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('add.manual.power')} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t('add.manual.optional')}</span></label>
                  <input className="input" type="number" step="1" min="0" placeholder="e.g. 160"
                    value={manualCar.engine_power_cv}
                    onChange={e => setManualCar(m => ({ ...m, engine_power_cv: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end">
                <button className="btn-primary" onClick={handleManualContinue}>
                  {t('common.next')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: confirm identity ──────────────────────────────────────── */}
      {step === 2 && parsed && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 style={{ color: 'var(--color-text)' }}>{t('add.identityTitle')}</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('add.identityHint')}</p>
            <IdentityFormFields form={identityForm} />
          </div>

          <div className="card space-y-3">
            <h3 style={{ color: 'var(--color-text)' }}>{t('add.parsedTitle')}</h3>
            <SpecsPreview parsed={parsed} overrides={manualOverrides} onOverride={handleOverride} />
          </div>

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>{t('common.back')}</button>
            <button className="btn-primary" onClick={handleIdentityNext}>{t('common.next')}</button>
          </div>
        </div>
      )}

      {/* ── Step 3: duplicate check / confirmation ────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Exact duplicate warning */}
          {duplicate?.exact && !dismissedDuplicate && (
            <div
              className="card space-y-3"
              style={{ borderColor: 'oklch(0.66 0.20 25)', background: 'oklch(0.97 0.03 25)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'oklch(0.40 0.18 25)' }}>
                {t('add.duplicateExact', {
                  car: `${duplicate.exact.make} ${duplicate.exact.model} ${duplicate.exact.trim ?? ''}`.trim(),
                })}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={() =>
                    navigate({ to: '/cars/$carId', params: { carId: duplicate.exact!.id } })
                  }
                >
                  {t('add.openExisting')}
                </button>
                <button className="btn-secondary" onClick={() => setDismissedDuplicate(true)}>
                  {t('add.continueNew')}
                </button>
              </div>
            </div>
          )}

          {/* Similar cars caution */}
          {(duplicate?.similar ?? []).length > 0 && !duplicate?.exact && !dismissedDuplicate && (
            <div
              className="card space-y-3"
              style={{ borderColor: 'oklch(0.78 0.14 75)', background: 'oklch(0.97 0.04 75)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'oklch(0.44 0.14 75)' }}>
                {t('add.duplicateSimilar')}
              </p>
              <ul className="text-sm space-y-1">
                {(duplicate?.similar ?? []).map((c) => (
                  <li key={c.id}>
                    <button
                      className="underline"
                      style={{ color: 'var(--color-primary-600)' }}
                      onClick={() => navigate({ to: '/cars/$carId', params: { carId: c.id } })}
                    >
                      {c.make} {c.model} {c.trim} {c.year}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn-secondary" onClick={() => setDismissedDuplicate(true)}>
                {t('add.continueNew')}
              </button>
            </div>
          )}

          {/* No duplicates (or dismissed) */}
          {(!duplicate?.exact || dismissedDuplicate) && (
            <div className="card space-y-3">
              <h3 style={{ color: 'var(--color-text)' }}>{t('add.confirmTitle')}</h3>
              <KVTable
                rows={[
                  { label: 'Make',      value: identityValues.make },
                  { label: 'Model',     value: identityValues.model },
                  identityValues.trim ? { label: 'Trim', value: identityValues.trim } : null,
                  identityValues.year ? { label: 'Year', value: identityValues.year } : null,
                  { label: 'Fuel type', value: parsed?.fuel_type ?? '—' },
                ].filter(Boolean) as import('~/client/lib/KVTable').KVRow[]}
              />
            </div>
          )}

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>{t('common.back')}</button>
            {(!duplicate?.exact || dismissedDuplicate) && (
              <button className="btn-primary" onClick={() => setStep(4)}>{t('common.next')}</button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: save ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="card space-y-4">
          <h3 style={{ color: 'var(--color-text)' }}>{t('add.saveTitle')}</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('add.saveHint')}</p>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(3)}>{t('common.back')}</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : t('add.saveButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
