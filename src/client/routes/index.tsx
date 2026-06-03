import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 style={{ color: 'var(--color-text)' }}>{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/cars" className="card group block no-underline hover:border-primary-300 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary-50)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }}>{t('dashboard.addCar')}</h3>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.addCarDesc')}
              </p>
            </div>
          </div>
        </Link>

        <Link to="/compare" className="card group block no-underline hover:border-primary-300 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'oklch(0.97 0.02 150)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.46 0.14 150)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="7" height="18" rx="1"/><rect x="15" y="3" width="7" height="18" rx="1"/>
                <path d="M9 8h6M9 12h6M9 16h6"/>
              </svg>
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }}>{t('dashboard.compare')}</h3>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.compareDesc')}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="mb-5" style={{ color: 'var(--color-text)' }}>{t('dashboard.howItWorks')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {([
            ['step1Title', 'step1Desc'],
            ['step2Title', 'step2Desc'],
            ['step3Title', 'step3Desc'],
          ] as const).map(([titleKey, descKey], i) => (
            <div key={i} className="flex gap-3">
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: 'var(--color-primary-600)', color: 'white' }}
              >
                {i + 1}
              </div>
              <div>
                <h3 style={{ color: 'var(--color-text)' }}>{t(`dashboard.${titleKey}`)}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t(`dashboard.${descKey}`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


