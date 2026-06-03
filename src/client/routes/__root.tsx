import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { ReactNode } from 'react'

export const Route = createRootRoute({
  component: RootLayout,
})

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-primary-600)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--color-text)' }}>
        CarCost
      </span>
    </div>
  )
}

function RootLayout() {
  const { t } = useTranslation()
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = () => setNavOpen(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-surface-subtle)' }}>
      {/* Backdrop — mobile only, shown when the drawer is open */}
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeNav}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — static from md up, off-canvas drawer below md */}
      <aside
        className={
          'fixed inset-y-0 left-0 z-40 w-56 shrink-0 flex flex-col transition-transform duration-200 ease-out ' +
          'md:static md:translate-x-0 ' +
          (navOpen ? 'translate-x-0' : '-translate-x-full')
        }
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Logo />
          {/* Close button — mobile only */}
          <button
            className="md:hidden p-1 -mr-1 rounded-md"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={closeNav}
            aria-label={t('nav.closeMenu', 'Close menu')}
          >
            <IconClose />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <NavItem to="/" icon={<IconHome />} onNavigate={closeNav}>{t('nav.dashboard')}</NavItem>
          <NavItem to="/cars" icon={<IconCar />} onNavigate={closeNav}>{t('nav.cars')}</NavItem>
          <NavItem to="/compare" icon={<IconCompare />} onNavigate={closeNav}>{t('nav.compare')}</NavItem>
          <NavItem to="/profiles" icon={<IconProfile />} onNavigate={closeNav}>{t('nav.profiles')}</NavItem>
        </nav>

        {/* Settings pinned bottom */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <NavItem to="/settings" icon={<IconSettings />} onNavigate={closeNav}>{t('nav.settings')}</NavItem>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar — hidden from md up */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-14 shrink-0"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            className="p-1.5 -ml-1.5 rounded-md"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => setNavOpen(true)}
            aria-label={t('nav.openMenu', 'Open menu')}
          >
            <IconMenu />
          </button>
          <Logo />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, icon, children, onNavigate }: { to: string; icon: ReactNode; children: ReactNode; onNavigate?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{ color: 'var(--color-text-muted)' }}
      activeProps={{
        style: {
          background: 'var(--color-primary-50)',
          color: 'var(--color-primary-700)',
        },
      }}
      activeOptions={{ exact: to === '/' }}
      inactiveProps={{
        onMouseEnter: (e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface-subtle)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
        },
        onMouseLeave: (e) => {
          ;(e.currentTarget as HTMLElement).style.background = ''
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
        },
      }}
    >
      <span className="opacity-70">{icon}</span>
      {children}
    </Link>
  )
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  )
}

function IconCompare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="7" height="18" rx="1"/><rect x="15" y="3" width="7" height="18" rx="1"/>
      <path d="M9 8h6M9 12h6M9 16h6"/>
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
