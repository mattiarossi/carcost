import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, wsLink, createWSClient } from '@trpc/client'
import { createTRPCContext, createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import superjson from 'superjson'
import type { AppRouter } from '~/server/trpc/router'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function buildWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:5173/trpc'
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/trpc`
}

const wsUrl = buildWsUrl()
console.log('[trpc] connecting WS to', wsUrl)
const wsClient = createWSClient({
  url: wsUrl,
  onOpen() { console.log('[trpc] WS open') },
  onClose(cause) { console.warn('[trpc] WS closed', cause) },
})

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    wsLink<AppRouter>({
      client: wsClient,
      transformer: superjson,
    }),
  ],
})

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>()

/** Non-hook proxy for route loaders */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
})
