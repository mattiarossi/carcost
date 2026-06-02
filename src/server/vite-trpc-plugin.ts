import type { Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import compression from 'compression'
import { appRouter } from './trpc/router.js'
import { createContext } from './trpc/context.js'
import { runMigrations } from './migrate.js'

const TRPC_PATH = '/trpc'

export function viteTrpcPlugin(): Plugin {
  return {
    name: 'carcost:trpc-ws',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      runMigrations()
      server.middlewares.use(compression() as never)

      const httpServer = server.httpServer
      if (!httpServer) {
        server.config.logger.warn('[trpc-ws] no httpServer; skipping WS attach')
        return
      }

      const wss = new WebSocketServer({ noServer: true, perMessageDeflate: true })

      applyWSSHandler({ wss, router: appRouter, createContext })

      wss.on('connection', (ws, req) => {
        console.log('[trpc-ws] client connected from', req.socket.remoteAddress)
        ws.on('close', (code, reason) => console.log('[trpc-ws] client disconnected', code, reason.toString()))
        ws.on('error', (err) => console.error('[trpc-ws] ws error', err))
      })

      httpServer.on('upgrade', (req, socket, head) => {
        console.log('[trpc-ws] upgrade request for', req.url)
        if (!req.url?.startsWith(TRPC_PATH)) {
          console.log('[trpc-ws] ignoring (not /trpc)')
          return
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req)
        })
      })

      httpServer.once('listening', () => {
        const addr = httpServer.address()
        const portStr = typeof addr === 'object' && addr ? `:${addr.port}` : ''
        server.config.logger.info(`[trpc-ws] tRPC ready at ws://127.0.0.1${portStr}${TRPC_PATH}`)
      })

      const cleanup = () => wss.close()
      httpServer.once('close', cleanup)
      process.once('SIGINT', cleanup)
      process.once('SIGTERM', cleanup)
    },
  }
}
