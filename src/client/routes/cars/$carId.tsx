import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTRPC, useTRPCClient } from '~/client/lib/trpc'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { KVTable } from '~/client/lib/KVTable'
import { PdfDropZone } from '~/client/components/PdfDropZone'
import type { ParsedFinance, ParsedSpecs, FuelType } from '~/server/parsers/types'
import type { DetectionResult } from '~/server/parsers/plugin'

export const Route = createFileRoute('/cars/$carId')({
  component: CarDetailPage,
})

// ── Finance offer card ────────────────────────────────────────────────────────

function FinanceCard({
  offer,
  isActive,
  onSetActive,
  onDelete,
}: {
  offer: { id: string; label?: string | null; list_price?: number | null; cash_price?: number | null; monthly_installment?: number | null; deposit?: number | null; residual_value?: number | null; duration_months?: number | null; n_installments?: number | null; total_financed?: number | null; total_repayable?: number | null; tan_pct?: number | null; taeg_pct?: number | null; annual_km_limit?: number | null; instruction_fees?: number | null; monthly_fees?: number | null; is_active?: number | null }
  isActive: boolean
  onSetActive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v.toLocaleString('it-IT')}${suffix}` : '—'

  return (
    <div
      className="card"
      style={{
        borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {offer.label ?? t('car.finance.title')}
            </span>
            {isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 600 }}>
                {t('car.finance.activeLabel')}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {offer.list_price != null && <span>{t('car.financeLabels.list_price').replace(' (€)', '')}: <strong style={{ color: 'var(--color-text)' }}>€{fmt(offer.list_price)}</strong></span>}
            {offer.cash_price != null && <span>{t('car.financeLabels.cash_price').replace(' (€)', '')}: <strong style={{ color: 'var(--color-accent)' }}>€{fmt(offer.cash_price)}</strong></span>}
            {offer.monthly_installment != null && <span>{t('car.financeLabels.monthly_installment').replace(' (€)', '')}: <strong style={{ color: 'var(--color-text)' }}>€{fmt(offer.monthly_installment)}</strong></span>}
            {offer.duration_months != null && <span>{fmt(offer.duration_months)} {t('car.financeLabels.duration_months').replace('Duration (', '').replace('Durata (', '').replace(')', '')}</span>}
            {offer.residual_value != null && <span>VFG: €{fmt(offer.residual_value)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isActive && (
            <button className="btn-secondary text-xs" onClick={onSetActive}>
              {t('car.finance.setActive')}
            </button>
          )}
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'oklch(0.65 0.18 25)', background: 'transparent' }}
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {offer.deposit != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.deposit')}</dt><dd style={{ color: 'var(--color-text)' }}>€{fmt(offer.deposit)}</dd></>}
            {offer.n_installments != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.n_installments')}</dt><dd style={{ color: 'var(--color-text)' }}>{offer.n_installments}</dd></>}
            {offer.total_financed != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.total_financed')}</dt><dd style={{ color: 'var(--color-text)' }}>€{fmt(offer.total_financed)}</dd></>}
            {offer.total_repayable != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.total_repayable')}</dt><dd style={{ color: 'var(--color-text)' }}>€{fmt(offer.total_repayable)}</dd></>}
            {offer.tan_pct != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.tan_pct')}</dt><dd style={{ color: 'var(--color-text)' }}>{offer.tan_pct}%</dd></>}
            {offer.taeg_pct != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.taeg_pct')}</dt><dd style={{ color: 'var(--color-text)' }}>{offer.taeg_pct}%</dd></>}
            {offer.annual_km_limit != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.annual_km_limit')}</dt><dd style={{ color: 'var(--color-text)' }}>{fmt(offer.annual_km_limit)} km</dd></>}
            {offer.instruction_fees != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.instruction_fees')}</dt><dd style={{ color: 'var(--color-text)' }}>€{fmt(offer.instruction_fees)}</dd></>}
            {offer.monthly_fees != null && <><dt style={{ color: 'var(--color-text-muted)' }}>{t('car.financeLabels.monthly_fees')}</dt><dd style={{ color: 'var(--color-text)' }}>€{fmt(offer.monthly_fees)}</dd></>}
          </dl>
        </div>
      )}
    </div>
  )
}

// ── Finance paste section ─────────────────────────────────────────────────────

// ── Specs paste section ───────────────────────────────────────────────────────

function SpecsPasteSection({ carId, hasSpecs }: { carId: string; hasSpecs: boolean }) {
  const { t } = useTranslation()
  const trpcClient = useTRPCClient()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(!hasSpecs)
  const [specMode, setSpecMode] = useState<'paste' | 'manual'>('paste')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedSpecs | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number | string>>({})
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [detections, setDetections] = useState<import('~/server/parsers/plugin').DetectionResult[]>([])
  const [pluginOverride, setPluginOverride] = useState<string | null>(null)
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual specs state
  const [manualSpecs, setManualSpecs] = useState({
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

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trpc.specs.get.queryKey({ carId }) })
  }, [queryClient, trpc, carId])

  // Debounced detect
  useEffect(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current)
    if (rawText.trim().length < 50) { setDetections([]); return }
    detectTimerRef.current = setTimeout(async () => {
      try {
        const results = await trpcClient.parse.detect.query({ text: rawText, type: 'specs' })
        setDetections(results)
      } catch { /* silent */ }
    }, 600)
    return () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current) }
  }, [rawText, trpcClient])

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return
    setParsing(true); setError(null); setParsed(null); setOverrides({})
    try {
      const result = await trpcClient.parse.specs.mutate({ text: rawText, pluginId: pluginOverride ?? undefined })
      setParsed(result)
    } catch (e) {
      console.error('[specs paste] parse failed', e)
      setError(t('common.error'))
    } finally { setParsing(false) }
  }, [rawText, pluginOverride, trpcClient, t])

  const n = (v: number | null | undefined) =>
    v === undefined || v === null || (typeof v === 'number' && isNaN(v)) ? undefined : v

  const doSave = useCallback(async (sp: ParsedSpecs) => {
    setSaving(true); setError(null)
    try {
      await trpcClient.specs.upsert.mutate({
        car_id: carId,
        engine_power_cv: n(sp.engine_power_cv),
        engine_power_kw: n(sp.engine_power_kw),
        engine_power_cv_ice: n(sp.engine_power_cv_ice),
        engine_power_kw_electric: n(sp.engine_power_kw_electric),
        transmission: sp.transmission,
        hybrid_architecture: sp.hybrid_architecture,
        primary_fuel: sp.primary_fuel,
        secondary_fuel: sp.secondary_fuel,
        fuel_consumption_urban: n(sp.fuel_consumption_urban),
        fuel_consumption_suburban: n(sp.fuel_consumption_suburban),
        fuel_consumption_combined: n(sp.fuel_consumption_combined),
        lpg_consumption_combined: n(sp.lpg_consumption_combined),
        cng_consumption_combined: n(sp.cng_consumption_combined),
        ev_consumption_combined: n(sp.ev_consumption_combined),
        ev_range_km: n(sp.ev_range_km),
        battery_capacity_kwh: n(sp.battery_capacity_kwh),
        battery_capacity_usable_kwh: n(sp.battery_capacity_usable_kwh),
        charge_time_ac_h: n(sp.charge_time_ac_h),
        charge_time_10_80_min: n(sp.charge_time_10_80_min),
        max_charge_power_kw: n(sp.max_charge_power_kw),
        co2_gkm: n(sp.co2_gkm),
        co2_gkm_weighted: n(sp.co2_gkm_weighted),
        emission_class: sp.emission_class,
        nox_gkm: n(sp.nox_gkm),
        weight_kg: n(sp.weight_kg),
        torque_nm: n(sp.torque_nm),
        raw_extras: JSON.stringify(sp.raw_extras ?? {}),
      })
      setSaved(true); setParsed(null); setRawText('')
      invalidate()
      if (hasSpecs) setOpen(false)
    } catch (e: unknown) {
      console.error('[specs paste] save failed', e)
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally { setSaving(false) }
  }, [carId, trpcClient, invalidate, hasSpecs, t])

  const handleSave = useCallback(async () => {
    if (!parsed) return
    const p = { ...parsed } as Record<string, unknown>
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== '' && v !== undefined) p[k] = v
    }
    await doSave(p as ParsedSpecs)
  }, [parsed, overrides, doSave])

  const handleManualSave = useCallback(async () => {
    const p = (s: string): number | undefined => { const num = parseFloat(s); return isNaN(num) ? undefined : num }
    const ft = manualSpecs.fuel_type
    const synth: ParsedSpecs = {
      fuel_type: ft,
      primary_fuel: ['ICE','MHEV','HEV','PHEV'].includes(ft)
        ? manualSpecs.primary_fuel
        : ft === 'LPG' ? 'lpg' : ft === 'CNG' ? 'cng' : 'electric',
      fuel_consumption_combined: p(manualSpecs.fuel_consumption_combined),
      ev_consumption_combined: p(manualSpecs.ev_consumption_combined),
      ev_range_km: p(manualSpecs.ev_range_km),
      battery_capacity_usable_kwh: p(manualSpecs.battery_capacity_usable_kwh),
      lpg_consumption_combined: p(manualSpecs.lpg_consumption_combined),
      cng_consumption_combined: p(manualSpecs.cng_consumption_combined),
      co2_gkm: p(manualSpecs.co2_gkm),
      engine_power_cv: p(manualSpecs.engine_power_cv),
      missing_fields: [],
      raw_extras: {},
      confidence: {},
    }
    await doSave(synth)
  }, [manualSpecs, doSave])

  const missing = parsed?.missing_fields ?? []

  if (!open) {
    return (
      <button className="btn-secondary text-sm" onClick={() => { setOpen(true); setSaved(false) }}>
        {saved
          ? t('car.specs.updateButtonDone')
          : hasSpecs ? t('car.specs.updateButton') : t('car.specs.noSpecsButton')}
      </button>
    )
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {hasSpecs ? t('car.specs.updateTitle') : t('car.specs.noSpecsTitle')}
        </h2>
        {hasSpecs && <button className="text-xs" style={{ color: 'var(--color-text-muted)' }} onClick={() => setOpen(false)}>✕</button>}
      </div>

      {/* Mode toggle */}
      {!parsed && (
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface-subtle)' }}>
          {(['paste', 'manual'] as const).map(mode => (
            <button
              key={mode}
              className="text-sm px-3 py-1 rounded-md transition-colors"
              onClick={() => { setSpecMode(mode); setError(null) }}
              style={{
                background: specMode === mode ? 'var(--color-primary-600)' : 'transparent',
                color: specMode === mode ? 'white' : 'var(--color-text)',
              }}
            >
              {mode === 'paste' ? t('car.specs.configuratorText') : t('car.specs.manualEntry')}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'oklch(0.55 0.18 25)' }}>{error}</p>}

      {!parsed ? (
        specMode === 'paste' ? (
          <>
            <PdfDropZone onText={setRawText}>
              <textarea
                className="input font-mono text-xs"
                rows={8}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={t('car.specs.placeholder')}
                style={{ resize: 'vertical' }}
              />
            </PdfDropZone>
            {/* Detection pill */}
            {detections.length > 0 && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {t('car.specs.detectedPlugin', { name: detections[0].displayName })}
                  {detections[0].score < 0.4 ? ' (low confidence)' : ''}
                </span>
                {detections.length > 1 && (
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '2px 6px', fontSize: '0.75rem' }}
                    value={pluginOverride ?? detections[0].pluginId}
                    onChange={e => setPluginOverride(e.target.value === detections[0].pluginId && !pluginOverride ? null : e.target.value)}
                    title={t('car.specs.pluginOverrideHint')}
                  >
                    {detections.map(d => (
                      <option key={d.pluginId} value={d.pluginId}>{d.displayName} ({Math.round(d.score * 100)}%)</option>
                    ))}
                  </select>
                )}
                {pluginOverride && (
                  <button className="text-xs underline" style={{ color: 'var(--color-primary-600)' }} onClick={() => setPluginOverride(null)}>
                    reset
                  </button>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <button className="btn-primary text-sm" onClick={handleParse} disabled={!rawText.trim() || parsing}>
                {parsing ? t('car.specs.parsing') : t('car.specs.parse')}
              </button>
            </div>
          </>
        ) : (
          /* Manual entry form */
          <div className="space-y-4">
            <div>
              <label className="label">{t('car.specs.fuelType')}</label>
              <select
                className="input"
                value={manualSpecs.fuel_type}
                onChange={e => setManualSpecs(m => ({ ...m, fuel_type: e.target.value as FuelType }))}
              >
                <option value="ICE">{t('car.specs.ice')}</option>
                <option value="MHEV">{t('car.specs.mhev')}</option>
                <option value="HEV">{t('car.specs.hev')}</option>
                <option value="PHEV">{t('car.specs.phev')}</option>
                <option value="BEV">{t('car.specs.bev')}</option>
                <option value="LPG">{t('car.specs.lpg')}</option>
                <option value="CNG">{t('car.specs.cng')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['ICE','MHEV','HEV','PHEV'] as FuelType[]).includes(manualSpecs.fuel_type) && (<>
                <div>
                  <label className="label">{t('car.specs.primaryFuel')}</label>
                  <select className="input" value={manualSpecs.primary_fuel}
                    onChange={e => setManualSpecs(m => ({ ...m, primary_fuel: e.target.value as 'petrol'|'diesel' }))}>
                    <option value="petrol">{t('car.specs.petrol')}</option>
                    <option value="diesel">{t('car.specs.diesel')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('car.specs.fuelConsumption')}</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 6.5"
                    value={manualSpecs.fuel_consumption_combined}
                    onChange={e => setManualSpecs(m => ({ ...m, fuel_consumption_combined: e.target.value }))} />
                </div>
              </>)}
              {(['PHEV','BEV'] as FuelType[]).includes(manualSpecs.fuel_type) && (<>
                <div>
                  <label className="label">{t('car.specs.evConsumption')}</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 17.0"
                    value={manualSpecs.ev_consumption_combined}
                    onChange={e => setManualSpecs(m => ({ ...m, ev_consumption_combined: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('car.specs.batteryUsable')}</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 63.0"
                    value={manualSpecs.battery_capacity_usable_kwh}
                    onChange={e => setManualSpecs(m => ({ ...m, battery_capacity_usable_kwh: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('car.specs.evRange')}</label>
                  <input className="input" type="number" step="1" min="0" placeholder="e.g. 400"
                    value={manualSpecs.ev_range_km}
                    onChange={e => setManualSpecs(m => ({ ...m, ev_range_km: e.target.value }))} />
                </div>
              </>)}
              {manualSpecs.fuel_type === 'LPG' && (
                <div>
                  <label className="label">{t('car.specs.lpgConsumption')}</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 8.0"
                    value={manualSpecs.lpg_consumption_combined}
                    onChange={e => setManualSpecs(m => ({ ...m, lpg_consumption_combined: e.target.value }))} />
                </div>
              )}
              {manualSpecs.fuel_type === 'CNG' && (
                <div>
                  <label className="label">{t('car.specs.cngConsumption')}</label>
                  <input className="input" type="number" step="0.1" min="0" placeholder="e.g. 3.5"
                    value={manualSpecs.cng_consumption_combined}
                    onChange={e => setManualSpecs(m => ({ ...m, cng_consumption_combined: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="label">{t('car.specs.co2')} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t('car.specs.optional')}</span></label>
                <input className="input" type="number" step="1" min="0" placeholder="e.g. 99"
                  value={manualSpecs.co2_gkm}
                  onChange={e => setManualSpecs(m => ({ ...m, co2_gkm: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('car.specs.power')} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t('car.specs.optional')}</span></label>
                <input className="input" type="number" step="1" min="0" placeholder="e.g. 160"
                  value={manualSpecs.engine_power_cv}
                  onChange={e => setManualSpecs(m => ({ ...m, engine_power_cv: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary text-sm" onClick={handleManualSave} disabled={saving}>
                {saving ? t('car.specs.saving') : t('car.specs.saveManual')}
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Missing field inputs */}
          {missing.length > 0 && (
            <div className="rounded-lg border px-4 py-3 space-y-3"
              style={{ borderColor: 'oklch(0.82 0.12 60)', background: 'oklch(0.97 0.04 60)' }}>
              <p className="text-sm font-semibold" style={{ color: 'oklch(0.45 0.14 50)' }}>
                ⚠ {t('car.specs.missingFields', { count: missing.length })}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {missing.map(m => (
                  <label key={m.field} className="flex items-center gap-3 text-sm">
                    <span className="w-64 shrink-0" style={{ color: 'oklch(0.45 0.10 50)' }}>{m.label}</span>
                    <input
                      type="number" step="any"
                      className="input w-32 text-sm"
                      value={overrides[m.field] ?? ''}
                      onChange={e => {
                        const num = parseFloat(e.target.value)
                        setOverrides(prev => ({ ...prev, [m.field]: isNaN(num) ? '' : num }))
                      }}
                      placeholder="—"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Parsed fields summary */}
          <KVTable
            rows={(
              Object.entries(parsed)
                .filter(([k, v]) => k !== 'raw_extras' && k !== 'confidence' && k !== 'missing_fields' && v !== undefined && v !== null)
                .map(([k, v]) => ({ label: k, value: String(v) }))
            )}
            size="xs"
          />
          <div className="flex justify-between">
            <button className="btn-secondary text-sm" onClick={() => setParsed(null)}>{t('car.specs.rePaste')}</button>
            <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
              {saving ? t('car.specs.saving') : t('car.specs.save')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// ── Finance paste section ─────────────────────────────────────────────────────

function FinancePasteSection({ carId }: { carId: string }) {
  const { t } = useTranslation()
  const trpc = useTRPC()
  const trpcClient = useTRPCClient()
  const queryClient = useQueryClient()
  const { data: offers, isLoading } = useQuery(trpc.finance.list.queryOptions({ carId }))

  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedFinance | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [financeMode, setFinanceMode] = useState<'paste' | 'manual'>('paste')
  const [detections, setDetections] = useState<DetectionResult[]>([])
  const [pluginOverride, setPluginOverride] = useState<string | null>(null)
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced auto-detect on finance paste text change
  useEffect(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current)
    if (rawText.trim().length < 50) { setDetections([]); return }
    detectTimerRef.current = setTimeout(async () => {
      try {
        const results = await trpcClient.parse.detect.query({ text: rawText, type: 'finance' })
        setDetections(results)
      } catch { /* silent */ }
    }, 600)
    return () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current) }
  }, [rawText, trpcClient])
  const [manualFinance, setManualFinance] = useState({
    label: '', list_price: '', cash_price: '', deposit: '',
    monthly_installment: '', n_installments: '', duration_months: '',
    residual_value: '', tan_pct: '', taeg_pct: '', annual_km_limit: '',
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trpc.finance.list.queryKey({ carId }) })
  }, [queryClient, trpc, carId])

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return
    setParsing(true)
    setError(null)
    setParsed(null)
    try {
      console.log('[finance parse] sending text length', rawText.length)
      const result = await trpcClient.parse.finance.mutate({ text: rawText, pluginId: pluginOverride ?? undefined })
      console.log('[finance parse] result', JSON.stringify(result, null, 2))
      setParsed(result)
    } catch (e) {
      console.error('[finance parse] FAILED', e)
      setError(t('common.error'))
    } finally {
      setParsing(false)
    }
  }, [rawText, pluginOverride, trpcClient, t])

  const handleSave = useCallback(async () => {
    if (!parsed) return
    setSaving(true)
    setError(null)
    const payload = {
      car_id: carId,
      list_price: parsed.list_price ?? 0,
      cash_price: parsed.cash_price,
      label: parsed.label,
      deposit: parsed.deposit,
      n_installments: parsed.n_installments,
      monthly_installment: parsed.monthly_installment,
      residual_value: parsed.residual_value,
      duration_months: parsed.duration_months,
      total_financed: parsed.total_financed,
      total_repayable: parsed.total_repayable,
      tan_pct: parsed.tan_pct,
      taeg_pct: parsed.taeg_pct,
      annual_km_limit: parsed.annual_km_limit,
      instruction_fees: parsed.instruction_fees,
      monthly_fees: parsed.monthly_fees,
      raw_text: rawText,
    }
    console.log('[finance save] payload', JSON.stringify(payload, null, 2))
    try {
      const result = await trpcClient.finance.create.mutate(payload)
      console.log('[finance save] success', result)
      setParsed(null)
      setRawText('')
      invalidate()
    } catch (e: unknown) {
      console.error('[finance save] FAILED', e)
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || t('common.error'))
    } finally {
      setSaving(false)
    }
  }, [parsed, rawText, carId, trpcClient, invalidate, t])

  const handleSetActive = useCallback(async (id: string) => {
    await trpcClient.finance.setActive.mutate({ id, car_id: carId })
    invalidate()
  }, [carId, trpcClient, invalidate])

  const handleDelete = useCallback(async (id: string) => {
    await trpcClient.finance.delete.mutate({ id })
    invalidate()
  }, [trpcClient, invalidate])

  const handleManualFinanceSave = useCallback(async () => {
    const p = (s: string): number | undefined => { const n = parseFloat(s); return isNaN(n) ? undefined : n }
    const listPrice = p(manualFinance.list_price)
    if (!listPrice) { setError('List price is required'); return }
    setSaving(true); setError(null)
    try {
      await trpcClient.finance.create.mutate({
        car_id: carId,
        list_price: listPrice,
        label: manualFinance.label || undefined,
        cash_price: p(manualFinance.cash_price),
        deposit: p(manualFinance.deposit),
        monthly_installment: p(manualFinance.monthly_installment),
        n_installments: p(manualFinance.n_installments) != null ? Math.round(p(manualFinance.n_installments)!) : undefined,
        duration_months: p(manualFinance.duration_months) != null ? Math.round(p(manualFinance.duration_months)!) : undefined,
        residual_value: p(manualFinance.residual_value),
        tan_pct: p(manualFinance.tan_pct),
        taeg_pct: p(manualFinance.taeg_pct),
        annual_km_limit: p(manualFinance.annual_km_limit) != null ? Math.round(p(manualFinance.annual_km_limit)!) : undefined,
      })
      setManualFinance({ label: '', list_price: '', cash_price: '', deposit: '', monthly_installment: '', n_installments: '', duration_months: '', residual_value: '', tan_pct: '', taeg_pct: '', annual_km_limit: '' })
      invalidate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }, [manualFinance, carId, trpcClient, invalidate, t])
  const financeLabels: Partial<Record<keyof ParsedFinance, string>> = {
    label: t('car.financeLabels.label'),
    list_price: t('car.financeLabels.list_price'),
    cash_price: t('car.financeLabels.cash_price'),
    deposit: t('car.financeLabels.deposit'),
    n_installments: t('car.financeLabels.n_installments'),
    monthly_installment: t('car.financeLabels.monthly_installment'),
    residual_value: t('car.financeLabels.residual_value'),
    duration_months: t('car.financeLabels.duration_months'),
    total_financed: t('car.financeLabels.total_financed'),
    total_repayable: t('car.financeLabels.total_repayable'),
    tan_pct: t('car.financeLabels.tan_pct'),
    taeg_pct: t('car.financeLabels.taeg_pct'),
    annual_km_limit: t('car.financeLabels.annual_km_limit'),
    instruction_fees: t('car.financeLabels.instruction_fees'),
    monthly_fees: t('car.financeLabels.monthly_fees'),
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {t('car.finance.title')}
      </h2>

      {/* Existing offers */}
      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
      ) : offers?.length ? (
        <div className="space-y-2">
          {offers.map(offer => (
            <FinanceCard
              key={offer.id}
              offer={offer}
              isActive={offer.is_active === 1}
              onSetActive={() => handleSetActive(offer.id)}
              onDelete={() => handleDelete(offer.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('car.finance.empty')}</p>
      )}

      {/* Add offer panel */}
      {!parsed ? (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {t('car.finance.addOffer')}
          </summary>
          <div className="mt-3 space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: 'var(--color-surface-subtle)' }}>
              {(['paste', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setFinanceMode(mode); setError(null) }}
                  className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: financeMode === mode ? 'var(--color-primary-600)' : 'transparent',
                    color: financeMode === mode ? 'white' : 'var(--color-text)',
                  }}
                >
                  {mode === 'paste' ? t('car.finance.configuratorText') : t('car.finance.manualEntry')}
                </button>
              ))}
            </div>

            {financeMode === 'paste' ? (
              <>
                <PdfDropZone onText={setRawText}>
                  <textarea
                    className="input font-mono text-xs"
                    rows={8}
                    placeholder={t('car.finance.placeholder')}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </PdfDropZone>
                {/* Detection pill */}
                {detections.length > 0 && (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {t('car.finance.detectedPlugin', { name: detections[0].displayName })}
                      {detections[0].score < 0.4 ? ' (low confidence)' : ''}
                    </span>
                    {detections.length > 1 && (
                      <select
                        className="input"
                        style={{ width: 'auto', padding: '2px 6px', fontSize: '0.75rem' }}
                        value={pluginOverride ?? detections[0].pluginId}
                        onChange={e => setPluginOverride(e.target.value === detections[0].pluginId && !pluginOverride ? null : e.target.value)}
                        title={t('car.finance.pluginOverrideHint')}
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
                {error && <p className="text-sm" style={{ color: 'oklch(0.65 0.18 25)' }}>{error}</p>}
                <button className="btn-primary text-sm" onClick={handleParse} disabled={parsing || !rawText.trim()}>
                  {parsing ? t('car.finance.parsing') : t('car.finance.parse')}
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['label',               'text',   'e.g. PCP offer',  false],
                    ['list_price',          'number', 'e.g. 32000',      true ],
                    ['cash_price',          'number', 'e.g. 28500',      false],
                    ['deposit',             'number', 'e.g. 3000',       false],
                    ['monthly_installment', 'number', 'e.g. 299',        false],
                    ['n_installments',      'number', 'e.g. 48',         false],
                    ['duration_months',     'number', 'e.g. 48',         false],
                    ['residual_value',      'number', 'e.g. 12000',      false],
                    ['tan_pct',             'number', 'e.g. 6.99',       false],
                    ['taeg_pct',            'number', 'e.g. 7.50',       false],
                    ['annual_km_limit',     'number', 'e.g. 15000',      false],
                  ] as Array<[keyof typeof manualFinance, string, string, boolean]>).map(([key, type, ph, required]) => (
                    <div key={key} className={key === 'label' ? 'col-span-2' : ''}>
                      <label className="label">
                        {t(`car.financeLabels.${key}`)}{required && <span style={{ color: 'oklch(0.55 0.18 25)' }}> *</span>}
                      </label>
                      <input
                        className="input text-sm"
                        type={type}
                        step={type === 'number' ? 'any' : undefined}
                        min={type === 'number' ? '0' : undefined}
                        placeholder={ph}
                        value={manualFinance[key]}
                        onChange={e => setManualFinance(f => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                {error && <p className="text-sm" style={{ color: 'oklch(0.65 0.18 25)' }}>{error}</p>}
                <div className="flex justify-end">
                  <button className="btn-primary text-sm" onClick={handleManualFinanceSave} disabled={saving || !manualFinance.list_price}>
                    {saving ? t('car.finance.saving') : t('car.finance.saveOffer')}
                  </button>
                </div>
              </>
            )}
          </div>
        </details>
      ) : (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t('car.finance.parsedResult')}</h3>
            <button
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setParsed(null)}
            >
              {t('car.finance.back')}
            </button>
          </div>

          <KVTable
            rows={(Object.entries(financeLabels) as Array<[keyof ParsedFinance, string]>)
              .filter(([k]) => parsed[k] !== undefined)
              .map(([k, label]) => ({
                label,
                value: k === 'label'
                  ? String(parsed[k])
                  : (parsed[k] as number).toLocaleString('it-IT'),
              }))}
          />

          {Object.keys(parsed.raw_extras ?? {}).length > 0 && (
            <details>
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                {t('car.finance.unrecognisedFields', { count: Object.keys(parsed.raw_extras).length })}
              </summary>
              <div className="mt-2">
                <KVTable
                  rows={Object.entries(parsed.raw_extras).map(([k, v]) => ({ label: k, value: v }))}
                  size="xs"
                />
              </div>
            </details>
          )}

          {error && <p className="text-sm" style={{ color: 'oklch(0.65 0.18 25)' }}>{error}</p>}
          <div className="flex gap-3">
            <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
              {saving ? t('car.finance.saving') : t('car.finance.saveOffer')}
            </button>
            <button className="btn-secondary text-sm" onClick={() => { setParsed(null) }}>
              {t('car.finance.discard')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CarDetailPage() {
  const { t } = useTranslation()
  const { carId } = Route.useParams()
  const trpc = useTRPC()
  const trpcClient = useTRPCClient()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: car, isLoading } = useQuery(trpc.cars.get.queryOptions({ id: carId }))
  const { data: specs } = useQuery(trpc.specs.get.queryOptions({ carId }))
  const [deleting, setDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!window.confirm(t('car.deleteConfirm'))) return
    setDeleting(true)
    try {
      await trpcClient.cars.delete.mutate({ id: carId })
      await queryClient.invalidateQueries({ queryKey: trpc.cars.list.queryKey() })
      navigate({ to: '/cars' })
    } catch (e) {
      console.error('[delete car]', e)
      setDeleting(false)
    }
  }, [carId, trpcClient, trpc, queryClient, navigate, t])

  if (isLoading) return <div className="p-8" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
  if (!car) return <div className="p-8" style={{ color: 'oklch(0.65 0.18 25)' }}>Car not found.</div>

  const specLabelKeys = [
    'engine_power_cv', 'engine_power_kw', 'engine_power_cv_ice', 'engine_power_kw_electric',
    'torque_nm', 'transmission', 'hybrid_architecture',
    'fuel_consumption_urban', 'fuel_consumption_suburban', 'fuel_consumption_combined',
    'lpg_consumption_combined', 'cng_consumption_combined', 'ev_consumption_combined',
    'ev_range_km', 'battery_capacity_kwh', 'battery_capacity_usable_kwh',
    'max_charge_power_kw', 'charge_time_ac_h', 'charge_time_10_80_min',
    'co2_gkm', 'co2_gkm_weighted', 'emission_class', 'nox_gkm', 'weight_kg',
  ] as const

  const specRows = specLabelKeys.filter(k => {
    const v = specs?.[k as keyof typeof specs]
    return v !== null && v !== undefined
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link to="/cars" className="text-sm hover:underline mb-3 inline-block" style={{ color: 'var(--color-text-muted)' }}>
          {t('car.backToList')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ color: 'var(--color-text)' }}>
              {car.make} {car.model}
              {car.trim && <span className="ml-2 text-lg font-normal" style={{ color: 'var(--color-text-muted)' }}>{car.trim}</span>}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {car.year ? `${car.year} · ` : ''}
              <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
                {car.fuel_type}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/cars/add" className="btn-secondary text-sm">{t('car.addAnother')}</Link>
            <button
              className="btn-secondary text-sm"
              style={{ color: 'oklch(0.55 0.18 25)', borderColor: 'oklch(0.85 0.08 25)' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('common.loading') : t('car.delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Specs */}
      {specRows.length > 0 && (
        <section className="card">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {t('car.techSpecs')}
            </h2>
            <SpecsPasteSection carId={carId} hasSpecs={true} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {specRows.map(k => (
              <>
                <dt key={`${k}-dt`} style={{ color: 'var(--color-text-muted)' }}>{t(`car.specLabels.${k}`)}</dt>
                <dd key={`${k}-dd`} className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {String(specs![k as keyof typeof specs])}
                </dd>
              </>
            ))}
          </dl>

          {specs?.raw_extras && (() => {
            let extras: Record<string, string> = {}
            try { extras = JSON.parse(specs.raw_extras) } catch { /* */ }
            const entries = Object.entries(extras)
            return entries.length > 0 ? (
              <details className="mt-3">
                <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                  {t('car.additionalFields', { count: entries.length })}
                </summary>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mt-2">
                  {entries.map(([k, v]) => (
                    <>
                      <dt key={`${k}-dt`} style={{ color: 'var(--color-text-muted)' }}>{k}</dt>
                      <dd key={`${k}-dd`} style={{ color: 'var(--color-text)' }}>{v}</dd>
                    </>
                  ))}
                </dl>
              </details>
            ) : null
          })()}
        </section>
      )}

      {/* Specs — missing case */}
      {specRows.length === 0 && <SpecsPasteSection carId={carId} hasSpecs={false} />}

      {/* Finance */}
      <FinancePasteSection carId={carId} />

      {/* Notes */}
      {car.notes && (
        <section className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('car.notes')}</h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>{car.notes}</p>
        </section>
      )}
    </div>
  )
}

