import { createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { routeTree } from './routeTree.gen'
import { TRPCProvider, queryClient, trpcClient } from '~/client/lib/trpc'

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadDelay: 50,
  defaultPreload: 'intent',
  Wrap: Providers,
})
