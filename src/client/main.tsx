import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { router } from './router'
import './styles.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', e, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: 'red', padding: 24, whiteSpace: 'pre-wrap' }}>
          {String(this.state.error)}{'\n'}{(this.state.error as Error).stack}
        </pre>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')!
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
