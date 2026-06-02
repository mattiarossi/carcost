import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTRPC, useTRPCClient } from '~/client/lib/trpc'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'

export const Route = createFileRoute('/profiles')({
  component: ProfilesPage,
})

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileFields = {
  name: string
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

const DEFAULTS: ProfileFields = {
  name: '',
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

// ── Sliders sum guard ─────────────────────────────────────────────────────────

function mixSum(f: ProfileFields) {
  return f.urban_pct + f.suburban_pct + f.freeway_pct
}

// ── Numeric input helper ──────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, min = 0, max, step = 1, unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="input w-24 text-sm"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>}
      </div>
    </label>
  )
}

// ── Profile form ──────────────────────────────────────────────────────────────

function ProfileForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: ProfileFields
  onSave: (f: ProfileFields) => void
  onCancel: () => void
  saving: boolean
}) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value }: { value: ProfileFields }) => {
      onSave(value)
    },
  })

  // Subscribe only to the fields needed for derived validation state
  const f = useStore(form.store, s => s.values)
  const sumOk = Math.abs(f.urban_pct + f.suburban_pct + f.freeway_pct - 100) < 0.5

  return (
    <div className="space-y-5">
      {/* Name */}
      <form.Field name="name">
        {(field) => (
          <label className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('profiles.fields.name')}</span>
            <input
              className="input"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t('profiles.fields.name')}
            />
          </label>
        )}
      </form.Field>

      {/* Usage */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="km_per_year">
          {(field) => (
            <NumInput label={t('profiles.fields.km_per_year')} value={field.state.value}
              onChange={v => field.handleChange(Math.round(v))} min={1000} max={200000} step={1000} />
          )}
        </form.Field>
        <form.Field name="ownership_years">
          {(field) => (
            <NumInput label={t('profiles.fields.ownership_years')} value={field.state.value}
              onChange={v => field.handleChange(Math.round(v))} min={1} max={10} />
          )}
        </form.Field>
      </div>

      {/* Driving mix */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('profiles.fields.driving_mix')}
          {!sumOk && (
            <span className="ml-2 text-amber-500">
              ({(f.urban_pct + f.suburban_pct + f.freeway_pct).toFixed(0)}% — {t('common.mustSum100')})
            </span>
          )}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <form.Field name="urban_pct">
            {(field) => (
              <NumInput label={t('profiles.fields.urban_pct')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} max={100} />
            )}
          </form.Field>
          <form.Field name="suburban_pct">
            {(field) => (
              <NumInput label={t('profiles.fields.suburban_pct')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} max={100} />
            )}
          </form.Field>
          <form.Field name="freeway_pct">
            {(field) => (
              <NumInput label={t('profiles.fields.freeway_pct')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} max={100} />
            )}
          </form.Field>
        </div>
      </div>

      {/* Fuel prices */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('profiles.fields.fuel_prices')}</p>
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="fuel_price_eur_per_liter">
            {(field) => (
              <NumInput label={t('profiles.fields.fuel_price_eur_per_liter')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
          <form.Field name="diesel_price_eur_per_liter">
            {(field) => (
              <NumInput label={t('profiles.fields.diesel_price_eur_per_liter')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
          <form.Field name="lpg_price_eur_per_liter">
            {(field) => (
              <NumInput label={t('profiles.fields.lpg_price_eur_per_liter')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
          <form.Field name="cng_price_eur_per_kg">
            {(field) => (
              <NumInput label={t('profiles.fields.cng_price_eur_per_kg')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
          <form.Field name="home_kwh_price">
            {(field) => (
              <NumInput label={t('profiles.fields.home_kwh_price')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
          <form.Field name="public_kwh_price">
            {(field) => (
              <NumInput label={t('profiles.fields.public_kwh_price')} value={field.state.value}
                onChange={v => field.handleChange(v)} min={0} step={0.01} />
            )}
          </form.Field>
        </div>
      </div>

      {/* EV charging */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="home_charge_pct">
          {(field) => (
            <NumInput label={t('profiles.fields.home_charge_pct')} value={field.state.value}
              onChange={v => field.handleChange(v)} min={0} max={100} />
          )}
        </form.Field>
        <form.Field name="solar_kwh_per_day">
          {(field) => (
            <NumInput label={t('profiles.fields.solar_kwh_per_day')} value={field.state.value}
              onChange={v => field.handleChange(v)} min={0} step={0.1} />
          )}
        </form.Field>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          className="btn-primary"
          disabled={saving || !f.name.trim() || !sumOk}
          onClick={() => form.handleSubmit()}
        >
          {saving ? '…' : t('common.save')}
        </button>
        <button className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  profile: ProfileFields & { id: string; is_default: number }
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const { t } = useTranslation()
  const isDefault = profile.is_default === 1

  return (
    <div
      className="card"
      style={{ borderLeft: isDefault ? '3px solid var(--color-accent)' : '3px solid transparent' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{profile.name}</span>
            {isDefault && (
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 600 }}>
                {t('profiles.defaultBadge')}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile.km_per_year.toLocaleString('it-IT')} km/y &middot;&nbsp;
            {profile.urban_pct}/{profile.suburban_pct}/{profile.freeway_pct}% &middot;&nbsp;
            {profile.ownership_years} yr &middot;&nbsp;
            €{profile.fuel_price_eur_per_liter.toFixed(2)}/L
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isDefault && (
            <button className="btn-secondary text-xs" onClick={onSetDefault}>
              {t('profiles.setDefault')}
            </button>
          )}
          <button className="btn-secondary text-xs" onClick={onEdit}>{t('common.edit')}</button>
          <button className="btn-secondary text-xs" style={{ color: 'var(--color-error, #ef4444)' }}
            onClick={onDelete}>{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ProfilesPage() {
  const { t } = useTranslation()
  const trpc = useTRPC()
  const client = useTRPCClient()
  const qc = useQueryClient()

  const { data: profiles = [], isLoading } = useQuery(trpc.profile.list.queryOptions())

  const [editing, setEditing] = useState<string | null>(null)   // profile id, or 'new'
  const [saving, setSaving] = useState(false)

  const invalidate = () => qc.invalidateQueries(trpc.profile.list.queryOptions())

  const handleSave = async (fields: ProfileFields) => {
    setSaving(true)
    try {
      if (editing === 'new') {
        await client.profile.create.mutate(fields)
      } else if (editing) {
        await client.profile.update.mutate({ id: editing, ...fields })
      }
      await invalidate()
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('profiles.deleteConfirm'))) return
    await client.profile.delete.mutate({ id })
    await invalidate()
  }

  const handleSetDefault = async (id: string) => {
    await client.profile.setDefault.mutate({ id })
    await invalidate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ color: 'var(--color-text)' }}>{t('profiles.title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('profiles.subtitle')}</p>
        </div>
        {editing !== 'new' && (
          <button className="btn-primary shrink-0" onClick={() => setEditing('new')}>
            {t('profiles.addProfile')}
          </button>
        )}
      </div>

      {/* New profile form */}
      {editing === 'new' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {t('profiles.newTitle')}
          </h2>
          <ProfileForm
            initial={DEFAULTS}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
      ) : profiles.length === 0 && editing !== 'new' ? (
        <div className="card">
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            {t('profiles.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(profiles as Array<ProfileFields & { id: string; is_default: number }>).map((p) =>
            editing === p.id ? (
              <div key={p.id} className="card space-y-4">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {t('profiles.editTitle')}
                </h2>
                <ProfileForm
                  initial={p}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => setEditing(p.id)}
                onDelete={() => handleDelete(p.id)}
                onSetDefault={() => handleSetDefault(p.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
