import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '~/client/i18n'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language.startsWith('it') ? 'it' : 'en'

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ color: 'var(--color-text)' }}>{t('settings.title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.subtitle')}</p>
      </div>

      {/* Language */}
      <div className="card space-y-4">
        <div>
          <h3 style={{ color: 'var(--color-text)' }}>{t('settings.language')}</h3>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.languageDesc')}</p>
        </div>
        <div className="flex gap-2">
          <LangButton
            active={currentLang === 'en'}
            flag="🇬🇧"
            label={t('settings.english')}
            onClick={() => setLanguage('en')}
          />
          <LangButton
            active={currentLang === 'it'}
            flag="🇮🇹"
            label={t('settings.italian')}
            onClick={() => setLanguage('it')}
          />
        </div>
      </div>
    </div>
  )
}

function LangButton({
  active, flag, label, onClick,
}: {
  active: boolean
  flag: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
      style={{
        border: active
          ? '2px solid var(--color-primary-600)'
          : '1px solid var(--color-border)',
        background: active ? 'var(--color-primary-50)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary-700)' : 'var(--color-text)',
        paddingLeft: active ? '15px' : '16px',
        paddingTop: active ? '9px' : '10px',
      }}
    >
      <span className="text-base">{flag}</span>
      {label}
    </button>
  )
}
