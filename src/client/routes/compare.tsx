import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTRPC } from '~/client/lib/trpc'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine, DotProps,
} from 'recharts'

export const Route = createFileRoute('/compare')({
  component: ComparePage,
})

// ── Profile values (mirrors server-side ProfileValues) ────────────────────────

type ProfileValues = {
  km_per_year: number
  urban_pct: number
  suburban_pct: number
  freeway_pct: number
  fuel_price_eur_per_liter: number
  diesel_price_eur_per_liter: number
  lpg_price_eur_per_liter: number
  cng_price_eur_per_kg: number
  home_kwh_price: number
  public_kwh_price: number
  home_charge_pct: number
  solar_kwh_per_day: number
  ownership_years: number
}

const PROFILE_DEFAULTS: ProfileValues = {
  km_per_year: 15000,
  urban_pct: 30,
  suburban_pct: 50,
  freeway_pct: 20,
  fuel_price_eur_per_liter: 1.85,
  diesel_price_eur_per_liter: 1.70,
  lpg_price_eur_per_liter: 0.75,
  cng_price_eur_per_kg: 1.10,
  home_kwh_price: 0.25,
  public_kwh_price: 0.55,
  home_charge_pct: 80,
  solar_kwh_per_day: 0,
  ownership_years: 4,
}

// ── Sweep variable config ─────────────────────────────────────────────────────

type SweepVariable =
  | 'petrol_price' | 'diesel_price' | 'lpg_price' | 'cng_price'
  | 'home_kwh_price' | 'public_kwh_price'
  | 'km_per_year' | 'home_charge_pct' | 'ownership_years' | 'solar_kwh_per_day'

type SweepConfig = {
  key: SweepVariable
  profileKey: keyof ProfileValues
  label: string
  min: number; max: number; step: number
  unit: string
  format: (v: number) => string
}

const SWEEP_CONFIGS: SweepConfig[] = [
  { key: 'petrol_price',     profileKey: 'fuel_price_eur_per_liter',   label: 'compare.sweep.labels.petrol_price',     min: 0.80, max: 3.00,  step: 0.05, unit: '€/L',   format: v => v.toFixed(2) },
  { key: 'diesel_price',     profileKey: 'diesel_price_eur_per_liter', label: 'compare.sweep.labels.diesel_price',     min: 0.70, max: 2.80,  step: 0.05, unit: '€/L',   format: v => v.toFixed(2) },
  { key: 'lpg_price',        profileKey: 'lpg_price_eur_per_liter',    label: 'compare.sweep.labels.lpg_price',        min: 0.40, max: 1.50,  step: 0.05, unit: '€/L',   format: v => v.toFixed(2) },
  { key: 'cng_price',        profileKey: 'cng_price_eur_per_kg',       label: 'compare.sweep.labels.cng_price',        min: 0.50, max: 3.00,  step: 0.05, unit: '€/kg',  format: v => v.toFixed(2) },
  { key: 'home_kwh_price',   profileKey: 'home_kwh_price',             label: 'compare.sweep.labels.home_kwh_price',   min: 0.05, max: 0.60,  step: 0.01, unit: '€/kWh', format: v => v.toFixed(2) },
  { key: 'public_kwh_price', profileKey: 'public_kwh_price',           label: 'compare.sweep.labels.public_kwh_price', min: 0.15, max: 1.00,  step: 0.05, unit: '€/kWh', format: v => v.toFixed(2) },
  { key: 'home_charge_pct',  profileKey: 'home_charge_pct',            label: 'compare.sweep.labels.home_charge_pct',  min: 0,    max: 100,   step: 5,    unit: '%',     format: v => `${v}%` },
  { key: 'km_per_year',      profileKey: 'km_per_year',                label: 'compare.sweep.labels.km_per_year',      min: 5000, max: 60000, step: 1000, unit: 'km',    format: v => `${(v/1000).toFixed(0)}k` },
  { key: 'ownership_years',  profileKey: 'ownership_years',            label: 'compare.sweep.labels.ownership_years',  min: 1,    max: 10,    step: 1,    unit: 'yr',    format: v => `${v}yr` },
  { key: 'solar_kwh_per_day',profileKey: 'solar_kwh_per_day',          label: 'compare.sweep.labels.solar_kwh_per_day',min: 0,    max: 30,    step: 0.5,  unit: 'kWh/d', format: v => `${v.toFixed(1)} kWh/d` },
]

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, ms = 400): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return dv
}

// ── Format helpers ─────────────────────────────────────────────────────────────

// \u202f = narrow no-break space before units
const fmt = {
  eur:    (v: number | null | undefined) => v != null ? `€\u202f${Math.round(v).toLocaleString('en')}` : '—',
  eurPkm: (v: number | null | undefined) => v != null ? `€\u202f${v.toFixed(4)}/km` : '—',
  eurPday:(v: number | null | undefined) => v != null ? `€\u202f${v.toFixed(2)}/d` : '—',
  l100:   (v: number | null | undefined) => v != null ? `${v.toFixed(1)}\u202fL/100km` : '—',
  kwh100: (v: number | null | undefined) => v != null ? `${v.toFixed(1)}\u202fkWh/100km` : '—',
  km:     (v: number | null | undefined) => v != null ? `${Math.round(v).toLocaleString('en')}\u202fkm` : '—',
  pct:    (v: number | null | undefined) => v != null ? `${v.toFixed(1)}%` : '—',
  gkm:    (v: number | null | undefined) => v != null ? `${Math.round(v)}\u202fg/km` : '—',
  kg:     (v: number | null | undefined) => v != null ? `${Math.round(v).toLocaleString('en')}\u202fkg` : '—',
  cv:     (v: number | null | undefined) => v != null ? `${Math.round(v)}\u202fCV` : '—',
  kw:     (v: number | null | undefined) => v != null ? `${Math.round(v)}\u202fkW` : '—',
  text:   (v: string | null | undefined) => v ?? '—',
}

// ── Row definitions ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = any

type Section = 'technical' | 'finance' | 'running' | 'tco'

type RowDef = {
  key: string
  section: Section
  highlight?: 'lower' | 'higher'
  getNum?: (d: AnyItem) => number | null | undefined
  render: (d: AnyItem) => string
}

const ROW_DEFS: RowDef[] = [
  // ── Technical ──────────────────────────────────────────────────────────────
  { key: 'fuel_type',                  section: 'technical',
    render: d => fmt.text(d.car.fuel_type) },
  { key: 'power_cv',                   section: 'technical', highlight: 'higher',
    getNum: d => d.specs.engine_power_cv,
    render: d => fmt.cv(d.specs.engine_power_cv) },
  { key: 'power_kw',                   section: 'technical', highlight: 'higher',
    getNum: d => d.specs.engine_power_kw,
    render: d => fmt.kw(d.specs.engine_power_kw) },
  { key: 'transmission',               section: 'technical',
    render: d => fmt.text(d.specs.transmission) },
  { key: 'fuel_consumption_combined',  section: 'technical', highlight: 'lower',
    getNum: d => d.specs.fuel_consumption_combined,
    render: d => fmt.l100(d.specs.fuel_consumption_combined) },
  { key: 'ev_consumption_combined',    section: 'technical', highlight: 'lower',
    getNum: d => d.specs.ev_consumption_combined ?? d.metrics.ev_consumption_used,
    render: d => {
      const v = d.specs.ev_consumption_combined ?? d.metrics.ev_consumption_used
      const derived = d.specs.ev_consumption_combined == null && v != null
      return v != null ? `${derived ? '~' : ''}${v.toFixed(1)}\u202fkWh/100km` : '—'
    } },
  { key: 'ev_range_km',                section: 'technical', highlight: 'higher',
    getNum: d => d.specs.ev_range_km,
    render: d => fmt.km(d.specs.ev_range_km) },
  { key: 'co2_gkm',                    section: 'technical', highlight: 'lower',
    getNum: d => d.specs.co2_gkm,
    render: d => fmt.gkm(d.specs.co2_gkm) },
  { key: 'emission_class',             section: 'technical',
    render: d => fmt.text(d.specs.emission_class) },

  // ── Finance ────────────────────────────────────────────────────────────────
  { key: 'list_price',          section: 'finance', highlight: 'lower',
    getNum: d => d.metrics.purchase_price,
    render: d => fmt.eur(d.metrics.purchase_price) },
  { key: 'deposit',             section: 'finance',
    render: d => fmt.eur(d.finance_raw.deposit) },
  { key: 'monthly_installment', section: 'finance', highlight: 'lower',
    getNum: d => d.finance_raw.monthly_installment,
    render: d => fmt.eur(d.finance_raw.monthly_installment) },
  { key: 'financing_premium',   section: 'finance', highlight: 'lower',
    getNum: d => d.metrics.cash_delta,
    render: d => d.metrics.cash_delta != null
      ? `${fmt.eur(d.metrics.cash_delta)} (${fmt.pct(d.metrics.financing_premium_pct)})` : '—' },
  { key: 'residual_value',      section: 'finance',
    render: d => fmt.eur(d.metrics.residual_value) },
  { key: 'monthly_cost_keep',   section: 'finance', highlight: 'lower',
    getNum: d => d.metrics.monthly_cost_keep,
    render: d => fmt.eur(d.metrics.monthly_cost_keep) },
  { key: 'monthly_cost_return', section: 'finance', highlight: 'lower',
    getNum: d => d.metrics.monthly_cost_return,
    render: d => fmt.eur(d.metrics.monthly_cost_return) },

  // ── Running costs ──────────────────────────────────────────────────────────
  { key: 'fuel_cost_annual',       section: 'running', highlight: 'lower',
    getNum: d => d.metrics.fuel_cost_annual,
    render: d => fmt.eur(d.metrics.fuel_cost_annual) },
  { key: 'energy_cost_annual',     section: 'running', highlight: 'lower',
    getNum: d => d.metrics.energy_cost_annual,
    render: d => fmt.eur(d.metrics.energy_cost_annual) },
  { key: 'ev_kwh_annual',           section: 'running',
    getNum: d => d.metrics.ev_kwh_annual,
    render: d => d.metrics.ev_kwh_annual != null ? `${Math.round(d.metrics.ev_kwh_annual).toLocaleString('en')}\u202fkWh` : '—' },
  { key: 'ev_kwh_solar_annual',     section: 'running', highlight: 'higher',
    getNum: d => d.metrics.ev_kwh_solar_annual,
    render: d => d.metrics.ev_kwh_solar_annual != null ? `${Math.round(d.metrics.ev_kwh_solar_annual).toLocaleString('en')}\u202fkWh` : '—' },
  { key: 'ev_kwh_grid_home_annual', section: 'running', highlight: 'lower',
    getNum: d => d.metrics.ev_kwh_grid_home_annual,
    render: d => d.metrics.ev_kwh_grid_home_annual != null ? `${Math.round(d.metrics.ev_kwh_grid_home_annual).toLocaleString('en')}\u202fkWh` : '—' },
  { key: 'ev_kwh_public_annual',    section: 'running', highlight: 'lower',
    getNum: d => d.metrics.ev_kwh_public_annual,
    render: d => d.metrics.ev_kwh_public_annual != null ? `${Math.round(d.metrics.ev_kwh_public_annual).toLocaleString('en')}\u202fkWh` : '—' },
  { key: 'service_cost_annual',    section: 'running', highlight: 'lower',
    getNum: d => d.metrics.service_cost_annual,
    render: d => fmt.eur(d.metrics.service_cost_annual) },
  { key: 'running_cost_annual',    section: 'running', highlight: 'lower',
    getNum: d => d.metrics.running_cost_annual,
    render: d => fmt.eur(d.metrics.running_cost_annual) },
  { key: 'running_cost_monthly',   section: 'running', highlight: 'lower',
    getNum: d => d.metrics.running_cost_monthly,
    render: d => fmt.eur(d.metrics.running_cost_monthly) },
  { key: 'running_cost_per_km',    section: 'running', highlight: 'lower',
    getNum: d => d.metrics.running_cost_per_km,
    render: d => fmt.eurPkm(d.metrics.running_cost_per_km) },
  { key: 'running_cost_per_day',   section: 'running', highlight: 'lower',
    getNum: d => d.metrics.running_cost_per_day,
    render: d => fmt.eurPday(d.metrics.running_cost_per_day) },
  { key: 'running_cost_total',     section: 'running', highlight: 'lower',
    getNum: d => d.metrics.running_cost_total,
    render: d => fmt.eur(d.metrics.running_cost_total) },

  // ── TCO ────────────────────────────────────────────────────────────────────
  { key: 'tco_total',    section: 'tco', highlight: 'lower',
    getNum: d => d.metrics.tco_total,
    render: d => fmt.eur(d.metrics.tco_total) },
  { key: 'tco_per_km',   section: 'tco', highlight: 'lower',
    getNum: d => d.metrics.tco_per_km,
    render: d => fmt.eurPkm(d.metrics.tco_per_km) },
  { key: 'tco_per_month',section: 'tco', highlight: 'lower',
    getNum: d => d.metrics.tco_per_month,
    render: d => fmt.eur(d.metrics.tco_per_month) },
  { key: 'co2_total_kg', section: 'tco', highlight: 'lower',
    getNum: d => d.metrics.co2_total_kg,
    render: d => fmt.kg(d.metrics.co2_total_kg) },
]

// ── TanStack Table row types ───────────────────────────────────────────────────

type SectionRow = { _type: 'section'; sectionKey: Section }
type DataRow    = RowDef & { _type: 'data' }
type CompareRow = SectionRow | DataRow

const compareColumnHelper = createColumnHelper<CompareRow>()

// Flat row list (static — same structure regardless of which cars are selected)
const SECTIONS: Section[] = ['technical', 'finance', 'running', 'tco']

const STATIC_TABLE_ROWS: CompareRow[] = SECTIONS.flatMap(section => [
  { _type: 'section', sectionKey: section } as SectionRow,
  ...ROW_DEFS.filter(r => r.section === section).map(rd => ({ _type: 'data' as const, ...rd })),
])

function bestWorst(
  values: (number | null | undefined)[],
  highlight: 'lower' | 'higher',
): { best: number; worst: number } | null {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null && isFinite(x.v))
  if (valid.length < 2) return null
  const sorted = [...valid].sort((a, b) => a.v - b.v)
  const bestIdx  = highlight === 'lower' ? sorted[0].i : sorted[sorted.length - 1].i
  const worstIdx = highlight === 'lower' ? sorted[sorted.length - 1].i : sorted[0].i
  if (bestIdx === worstIdx) return null
  return { best: bestIdx, worst: worstIdx }
}

// ── Best/worst index finder ───────────────────────────────────────────────────────

function buildLLMContext(items: Array<[string, AnyItem]>, profile: ProfileValues): string {
  const lines = [
    '# Car Comparison — LLM Context', '',
    '## Usage Profile',
    `- Annual km: ${profile.km_per_year.toLocaleString()}`,
    `- Driving mix: ${profile.urban_pct}% urban / ${profile.suburban_pct}% suburban / ${profile.freeway_pct}% freeway`,
    `- Fuel prices: petrol €${profile.fuel_price_eur_per_liter}/L, diesel €${profile.diesel_price_eur_per_liter}/L, LPG €${profile.lpg_price_eur_per_liter}/L, CNG €${profile.cng_price_eur_per_kg}/kg`,
    `- Home electricity: €${profile.home_kwh_price}/kWh | Public charging: €${profile.public_kwh_price}/kWh`,
    `- Home charging: ${profile.home_charge_pct}% | Solar: ${profile.solar_kwh_per_day} kWh/day`,
    `- Ownership horizon: ${profile.ownership_years} years`,
  ]

  for (const [, item] of items) {
    const m = item.metrics
    const s = item.specs
    lines.push('', `## ${item.label} (${item.car.fuel_type})`)

    const specParts: string[] = []
    if (s.engine_power_cv) specParts.push(`${Math.round(s.engine_power_cv)} CV`)
    if (s.engine_power_kw) specParts.push(`${Math.round(s.engine_power_kw)} kW`)
    if (s.transmission) specParts.push(s.transmission)
    if (s.fuel_consumption_combined) specParts.push(`${s.fuel_consumption_combined.toFixed(1)} L/100km`)
    if (s.ev_consumption_combined) specParts.push(`${s.ev_consumption_combined.toFixed(1)} kWh/100km`)
    if (s.ev_range_km) specParts.push(`range ${Math.round(s.ev_range_km)} km`)
    if (s.co2_gkm != null) specParts.push(`CO₂ ${Math.round(s.co2_gkm)} g/km`)
    if (s.emission_class) specParts.push(s.emission_class)
    if (specParts.length) lines.push(`**Specs**: ${specParts.join(', ')}`)

    lines.push(
      `**Finance**: list €${Math.round(m.purchase_price)}, deposit €${Math.round(item.finance_raw.deposit)}, €${Math.round(item.finance_raw.monthly_installment ?? 0)}/month, residual €${Math.round(m.residual_value)}, financing premium €${Math.round(m.cash_delta)} (${m.financing_premium_pct.toFixed(1)}%)`,
      `**Running costs**: fuel €${Math.round(m.fuel_cost_annual)}/yr, energy €${Math.round(m.energy_cost_annual)}/yr, service €${Math.round(m.service_cost_annual)}/yr → total €${Math.round(m.running_cost_annual)}/yr (€${m.running_cost_per_km.toFixed(4)}/km, €${Math.round(m.running_cost_monthly)}/month)`,
      `**TCO**: €${Math.round(m.tco_total)} over ${profile.ownership_years} years (€${m.tco_per_km.toFixed(4)}/km, €${Math.round(m.tco_per_month)}/month)`,
    )
    if (m.co2_total_kg != null) {
      lines.push(`**CO₂ total**: ${Math.round(m.co2_total_kg).toLocaleString()} kg`)
    }
  }
  return lines.join('\n')
}

// ── Small reusable NumInput ───────────────────────────────────────────────────

function NumInput({ value, onChange, step = 1, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full rounded border px-2 py-1 text-sm"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
    />
  )
}

// ── Collapsible panel wrapper ─────────────────────────────────────────────────

function Panel({ title, badge, hint, open, onToggle, children }: {
  title: string; badge?: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="card">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold"
        style={{ color: 'var(--color-text)' }}
        onClick={onToggle}
      >
        <span className="flex items-center gap-1.5">
          {title}
          {hint && (
            <span
              title={hint}
              onClick={e => e.stopPropagation()}
              className="inline-flex cursor-help items-center justify-center rounded-full"
              style={{ width: 13, height: 13, fontSize: 9, lineHeight: 1, color: 'var(--color-text-muted)', border: '1px solid currentColor', flexShrink: 0 }}
            >i</span>
          )}
          {badge && (
            <span className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ background: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}>
              {badge}
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

// ── Main compare page ─────────────────────────────────────────────────────────

function ComparePage() {
  const { t } = useTranslation()
  const trpc = useTRPC()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [profile, setProfile] = useState<ProfileValues>(PROFILE_DEFAULTS)
  // committedProfile only updates on slider release — drives the chart query
  const [committedProfile, setCommittedProfile] = useState<ProfileValues>(PROFILE_DEFAULTS)
  const [carPanelOpen, setCarPanelOpen] = useState(true)
  const [profilePanelOpen, setProfilePanelOpen] = useState(true)
  const [whatIfOpen, setWhatIfOpen] = useState(true)
  const [viewTab, setViewTab] = useState<'table' | 'chart'>('table')
  const [sweepVar, setSweepVar] = useState<SweepVariable>('petrol_price')
  const [sweepYAxis, setSweepYAxis] = useState<'tco_total' | 'tco_per_km' | 'running_cost_annual'>('tco_total')
  const [copied, setCopied] = useState(false)

  const debouncedProfile = useDebounced(profile, 400)

  const carsQ    = useQuery(trpc.cars.list.queryOptions())
  const profilesQ = useQuery(trpc.profile.list.queryOptions())
  const metricsQ  = useQuery({
    ...trpc.metrics.compareData.queryOptions({ carIds: selectedIds, profile: debouncedProfile }),
    enabled: selectedIds.length > 0,
  })

  // ── Sweep chart query — fires once per slider release via committedProfile ───
  const sweepCfg = SWEEP_CONFIGS.find(c => c.key === sweepVar)!
  const crossoverQ = useQuery({
    ...trpc.metrics.sensitivity.queryOptions({
      carIds: selectedIds,
      profile: committedProfile,
      sweepVariable: sweepVar,
      sweepMin: sweepCfg.min,
      sweepMax: sweepCfg.max,
      steps: 60,
      yAxis: sweepYAxis,
    }),
    enabled: selectedIds.length > 0 && viewTab === 'chart',
    placeholderData: keepPreviousData,
  })

  // sync committedProfile when default profile loads
  useEffect(() => {
    if (!profilesQ.data?.length) return
    const def = profilesQ.data.find(p => p.is_default === 1) ?? profilesQ.data[0]
    if (!def) return
    const next: ProfileValues = {
      km_per_year: def.km_per_year,
      urban_pct: def.urban_pct,
      suburban_pct: def.suburban_pct,
      freeway_pct: def.freeway_pct,
      fuel_price_eur_per_liter: def.fuel_price_eur_per_liter,
      diesel_price_eur_per_liter: def.diesel_price_eur_per_liter,
      lpg_price_eur_per_liter: def.lpg_price_eur_per_liter,
      cng_price_eur_per_kg: def.cng_price_eur_per_kg,
      home_kwh_price: def.home_kwh_price,
      public_kwh_price: def.public_kwh_price,
      home_charge_pct: def.home_charge_pct,
      solar_kwh_per_day: def.solar_kwh_per_day,
      ownership_years: def.ownership_years,
    }
    setProfile(next)
    setCommittedProfile(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesQ.data])

  const toggleCar = useCallback((id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }, [])

  const set = useCallback(<K extends keyof ProfileValues>(key: K, val: number) => {
    setProfile(p => ({ ...p, [key]: val }))
  }, [])

  const commit = useCallback(() => {
    setProfile(p => { setCommittedProfile(p); return p })
  }, [])

  const loadPreset = useCallback((id: string) => {
    const p = profilesQ.data?.find(x => x.id === id)
    if (!p) return
    const next: ProfileValues = {
      km_per_year: p.km_per_year, urban_pct: p.urban_pct,
      suburban_pct: p.suburban_pct, freeway_pct: p.freeway_pct,
      fuel_price_eur_per_liter: p.fuel_price_eur_per_liter,
      diesel_price_eur_per_liter: p.diesel_price_eur_per_liter,
      lpg_price_eur_per_liter: p.lpg_price_eur_per_liter,
      cng_price_eur_per_kg: p.cng_price_eur_per_kg,
      home_kwh_price: p.home_kwh_price, public_kwh_price: p.public_kwh_price,
      home_charge_pct: p.home_charge_pct, solar_kwh_per_day: p.solar_kwh_per_day,
      ownership_years: p.ownership_years,
    }
    setProfile(next)
    setCommittedProfile(next)
  }, [profilesQ.data])

  const handleCopyLLM = useCallback(() => {
    if (!metricsQ.data) return
    const items = Object.entries(metricsQ.data)
    const ordered = selectedIds.map(id => [id, items.find(([k]) => k === id)?.[1]] as [string, AnyItem]).filter(([, v]) => v)
    navigator.clipboard.writeText(buildLLMContext(ordered, profile)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }, [metricsQ.data, selectedIds, profile])

  // Build ordered items list (same order as selectedIds)
  const data = metricsQ.data
  const orderedItems: Array<[string, AnyItem]> = data
    ? selectedIds.map(id => [id, data[id]]).filter(([, v]) => v != null) as Array<[string, AnyItem]>
    : []

  // ── TanStack Table columns (rebuilt when orderedItems changes) ─────────────
  const tableColumns = useMemo<ColumnDef<CompareRow>[]>(() => {
    const cols: ColumnDef<CompareRow>[] = [
      {
        id: 'label',
        header: '',
        size: 210,
        cell: ({ row }) =>
          row.original._type === 'section'
            ? null
            : t(`compare.rows.${(row.original as DataRow).key}`),
      },
    ]
    orderedItems.forEach(([carId, item], colIdx) => {
      cols.push({
        id: `car_${carId}`,
        header: item.label,
        size: 170,
        cell: ({ row }) => {
          if (row.original._type === 'section') return null
          const rowDef = row.original as DataRow
          const nums   = orderedItems.map(([, d]) => rowDef.getNum?.(d) ?? null)
          const bw     = rowDef.highlight ? bestWorst(nums, rowDef.highlight) : null
          const isBest  = bw?.best  === colIdx
          const isWorst = bw?.worst === colIdx
          return (
            <span style={{
              color:      isBest  ? '#22c55e' : isWorst ? '#ef4444' : 'var(--color-text)',
              fontWeight: isBest || isWorst ? 600 : 400,
            }}>
              {rowDef.render(item)}
            </span>
          )
        },
      })
    })
    return cols
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedItems, t])

  const compareTable = useReactTable({
    data: STATIC_TABLE_ROWS,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const mixSum = profile.urban_pct + profile.suburban_pct + profile.freeway_pct
  const mixOk  = Math.abs(mixSum - 100) < 0.5

  // Profile fields config: [key, step, min]
  const profileFieldsConfig: Array<[keyof ProfileValues, number, number]> = [
    ['km_per_year',               1000,  1000],
    ['urban_pct',                 1,     0   ],
    ['suburban_pct',              1,     0   ],
    ['freeway_pct',               1,     0   ],
    ['fuel_price_eur_per_liter',  0.01,  0.10],
    ['diesel_price_eur_per_liter',0.01,  0.10],
    ['lpg_price_eur_per_liter',   0.01,  0.10],
    ['cng_price_eur_per_kg',      0.01,  0.10],
    ['home_kwh_price',            0.01,  0.01],
    ['public_kwh_price',          0.01,  0.01],
    ['home_charge_pct',           1,     0   ],
    ['solar_kwh_per_day',         0.5,   0   ],
    ['ownership_years',           1,     1   ],
  ]

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--color-text)' }}>{t('compare.title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('compare.subtitle')}
        </p>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 rounded-lg p-1"
        style={{ background: 'var(--color-surface-subtle)', width: 'fit-content' }}>
        {(['table', 'chart'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: viewTab === tab ? 'var(--color-primary-600)' : 'transparent',
              color: viewTab === tab ? 'white' : 'var(--color-text)',
            }}
          >
            {tab === 'table' ? t('compare.tabs.table') : t('compare.tabs.chart')}
          </button>
        ))}
      </div>

      {/* Car selector */}
      <Panel
        title={t('compare.selectCars')}
        badge={selectedIds.length > 0 ? String(selectedIds.length) : undefined}
        open={carPanelOpen}
        onToggle={() => setCarPanelOpen(o => !o)}
      >
        {!carsQ.data || carsQ.data.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('compare.noCars')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {carsQ.data.map(car => {
              const checked = selectedIds.includes(car.id)
              return (
                <button
                  key={car.id}
                  onClick={() => toggleCar(car.id)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                  style={{
                    borderColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
                    background:  checked ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-subtle)',
                    color: 'var(--color-text)',
                  }}
                >
                  {/* Checkbox visual */}
                  <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-sm border"
                    style={{
                      borderColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
                      background:  checked ? 'var(--color-accent)' : 'transparent',
                      color: '#fff',
                    }}>
                    {checked && <span style={{ fontSize: 9, lineHeight: 1 }}>✓</span>}
                  </span>
                  <span>
                    <span className="font-medium">{car.make} {car.model}</span>
                    {car.trim && <span className="ml-1 opacity-60">{car.trim}</span>}
                    <span className="ml-2 rounded px-1 font-mono text-xs"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                      {car.fuel_type}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Profile panel — table tab only */}
      {viewTab === 'table' && <Panel
        title={t('compare.profilePanel')}
        open={profilePanelOpen}
        onToggle={() => setProfilePanelOpen(o => !o)}
      >
        {/* Preset selector */}
        {profilesQ.data && profilesQ.data.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('compare.presetLabel')}:
            </span>
            <select
              className="rounded border px-2 py-1 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
              defaultValue=""
              onChange={e => { if (e.target.value) loadPreset(e.target.value) }}
            >
              <option value="">{t('compare.presetPlaceholder')}</option>
              {profilesQ.data.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Fields grid */}
        <div className="grid gap-x-3 gap-y-2 text-xs"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
          {profileFieldsConfig.map(([key, step, min]) => (
            <label key={key} className="flex flex-col gap-0.5">
              <span style={{ color: 'var(--color-text-muted)' }}>
                {t(`profiles.fields.${key}`)}
              </span>
              <NumInput value={profile[key] as number} onChange={v => set(key, v)} step={step} min={min} />
            </label>
          ))}
        </div>

        {/* Mix sum warning */}
        {!mixOk && (
          <p className="mt-2 text-xs font-medium" style={{ color: '#f59e0b' }}>
            ⚠ Urban + Suburban + Freeway = {mixSum.toFixed(0)}% (should be 100%)
          </p>
        )}
        <span
          title={t('compare.profilePanelHint')}
          className="mt-2 inline-flex cursor-help items-center justify-center rounded-full"
          style={{ width: 16, height: 16, fontSize: 10, lineHeight: 1, color: 'var(--color-text-muted)', border: '1px solid currentColor', flexShrink: 0 }}
        >i</span>
      </Panel>}

      {/* Empty state */}
      {selectedIds.length === 0 && (
        <div className="card">
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('compare.empty')}
          </p>
        </div>
      )}

      {/* ── TABLE TAB ─────────────────────────────────────────────────── */}
      {viewTab === 'table' && selectedIds.length > 0 && (
        <div className="card p-0 overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {metricsQ.isFetching
                ? t('common.loading')
                : orderedItems.length
                  ? `${orderedItems.length} car${orderedItems.length > 1 ? 's' : ''}`
                  : t('common.loading')
              }
            </span>
            <div className="flex items-center gap-2">
              {metricsQ.isError && (
                <span className="text-xs" style={{ color: '#ef4444' }}>{t('common.error')}</span>
              )}
              {orderedItems.length > 0 && (
                <button
                  onClick={handleCopyLLM}
                  className="rounded border px-3 py-1 text-xs transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface-subtle)',
                    color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {copied ? t('compare.copied') : t('compare.copyLLM')}
                </button>
              )}
            </div>
          </div>

          {orderedItems.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {compareTable.getFlatHeaders().map(header => (
                      <th key={header.id} style={header.id === 'label' ? stickyThStyle : carThStyle}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {compareTable.getRowModel().rows.map(row => {
                    if (row.original._type === 'section') {
                      return (
                        <tr key={row.id}>
                          <td
                            colSpan={compareTable.getVisibleLeafColumns().length}
                            style={sectionHeaderStyle}
                          >
                            {t(`compare.sections.${(row.original as SectionRow).sectionKey}`)}
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            style={
                              cell.column.id === 'label'
                                ? labelCellStyle
                                : { padding: '7px 16px', textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }
                            }
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CHART TAB ─────────────────────────────────────────────────── */}
      {viewTab === 'chart' && selectedIds.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Sliders — full width on mobile; sticky 240px column from md up */}
          <div className="w-full md:w-60 md:shrink-0 md:sticky md:top-4">
            <Panel
              title={t('compare.sweep.title')}
              badge="sliders"
              hint={t('compare.sweep.hint')}
              open={whatIfOpen}
              onToggle={() => setWhatIfOpen(o => !o)}
            >
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}
                className="flex flex-col gap-3 pr-1">
                {SWEEP_CONFIGS.map(cfg => (
                  <div key={cfg.key}>
                    <div className="mb-0.5 flex items-center justify-between" style={{ fontSize: 11 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{t(cfg.label)}</span>
                      <span className="font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                        {cfg.format(profile[cfg.profileKey] as number)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      value={profile[cfg.profileKey] as number}
                      onChange={e => set(cfg.profileKey, parseFloat(e.target.value))}
                      onPointerUp={commit}
                      className="w-full"
                      style={{ accentColor: 'var(--color-accent)', height: 16 }}
                    />
                    <div className="flex justify-between" style={{ fontSize: 10, color: 'var(--color-text-muted)', opacity: 0.5 }}>
                      <span>{cfg.format(cfg.min)}</span>
                      <span>{cfg.format(cfg.max)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Chart — fills remaining space */}
          {orderedItems.length > 0 && (
            <div className="card min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {t('compare.tabs.chart')}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('compare.sweep.xAxisLabel')}</label>
                  <select
                    value={sweepVar}
                    onChange={e => setSweepVar(e.target.value as SweepVariable)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                  >
                    {SWEEP_CONFIGS.map(c => (
                      <option key={c.key} value={c.key}>{t(c.label)}</option>
                    ))}
                  </select>
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('compare.sweep.yAxisLabel')}</label>
                  <select
                    value={sweepYAxis}
                    onChange={e => setSweepYAxis(e.target.value as typeof sweepYAxis)}
                    className="rounded border px-2 py-1 text-xs"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                  >
                    <option value="tco_total">{t('compare.sweep.yAxisOptions.tco_total')}</option>
                    <option value="tco_per_km">{t('compare.sweep.yAxisOptions.tco_per_km')}</option>
                    <option value="running_cost_annual">{t('compare.sweep.yAxisOptions.running_cost_annual')}</option>
                  </select>
                </div>
              </div>

              {crossoverQ.isFetching && !crossoverQ.data ? (
                <div className="flex h-52 items-center justify-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Loading…
                </div>
              ) : crossoverQ.data ? (
                <div style={{ opacity: crossoverQ.isFetching ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  <CrossoverChart
                    result={crossoverQ.data}
                    sweepCfg={sweepCfg}
                    yAxis={sweepYAxis}
                    labels={Object.fromEntries(orderedItems.map(([id, d]) => [id, d.label as string]))}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── CrossoverChart ────────────────────────────────────────────────────────────

interface CrossoverResult {
  series: Array<{ carId: string; label: string; points: Array<{ x: number; y: number }> }>
  crossovers: Array<{ carIdA: string; carIdB: string; x: number; y: number }>
  currentX: number
}

// Custom dot to mark crossover intersections
function CrossoverDot(props: DotProps & { crossoverXs: number[] }) {
  const { cx, cy, payload, crossoverXs } = props as DotProps & { payload: { x: number }; crossoverXs: number[] }
  if (!crossoverXs.some(cx_ => Math.abs((payload?.x ?? 0) - cx_) < 0.001)) return null
  return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
}

function CrossoverChart({ result, sweepCfg, yAxis, labels }: {
  result: CrossoverResult
  sweepCfg: SweepConfig
  yAxis: 'tco_total' | 'tco_per_km' | 'running_cost_annual'
  labels: Record<string, string>
}) {
  // Build flat data: one row per X point, one key per car
  const allX = result.series[0]?.points.map(p => p.x) ?? []
  const chartData = allX.map((x, i) => {
    const row: Record<string, number> = { x }
    for (const s of result.series) row[s.carId] = s.points[i]?.y ?? 0
    return row
  })

  const crossoverXs = result.crossovers.map(c => c.x)

  const yLabel = yAxis === 'tco_total'           ? 'TCO (€)'
    : yAxis === 'tco_per_km'        ? 'TCO / km (€)'
    : 'Running cost / year (€)'

  const yFormatter = yAxis === 'tco_per_km'
    ? (v: number) => `€${v.toFixed(4)}`
    : (v: number) => `€${Math.round(v).toLocaleString('en')}`

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="x"
          type="number"
          scale="linear"
          domain={[sweepCfg.min, sweepCfg.max]}
          tickFormatter={sweepCfg.format}
          label={{ value: sweepCfg.label, position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--color-text-muted)' }}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--color-text-muted)' }}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(v: any) => sweepCfg.format(Number(v))}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, name: any) => [yFormatter(Number(v)), labels[name as string] ?? name]}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => labels[value] ?? value}
        />
        {/* Current value marker */}
        <ReferenceLine
          x={result.currentX}
          stroke="var(--color-accent)"
          strokeDasharray="4 3"
          label={{ value: sweepCfg.format(result.currentX), position: 'top', fontSize: 10, fill: 'var(--color-accent)' }}
        />
        {/* Crossover markers */}
        {result.crossovers.map((c, i) => (
          <ReferenceLine key={i} x={c.x} stroke="#f59e0b" strokeDasharray="2 4" strokeWidth={1} />
        ))}
        {result.series.map((s, i) => (
          <Line
            key={s.carId}
            dataKey={s.carId}
            name={labels[s.carId] ?? s.label}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={<CrossoverDot crossoverXs={crossoverXs} />}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Table cell styles (defined outside to avoid re-creation per render) ────────

const stickyThStyle: React.CSSProperties = {
  position: 'sticky', left: 0, zIndex: 3,
  background: 'var(--color-bg)',
  padding: '8px 16px',
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--color-text-muted)',
  fontWeight: 500,
  minWidth: 210,
  borderRight: '1px solid var(--color-border)',
}

const carThStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'right',
  fontSize: 13,
  color: 'var(--color-text)',
  fontWeight: 700,
  minWidth: 170,
  whiteSpace: 'nowrap',
}

const sectionHeaderStyle: React.CSSProperties = {
  padding: '10px 16px 5px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface-subtle)',
  borderTop: '1px solid var(--color-border)',
}

const labelCellStyle: React.CSSProperties = {
  position: 'sticky', left: 0, zIndex: 1,
  background: 'var(--color-bg)',
  padding: '7px 16px',
  fontSize: 12,
  color: 'var(--color-text-muted)',
  borderRight: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}

