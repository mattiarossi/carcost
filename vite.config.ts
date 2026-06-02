import { defineConfig, loadEnv, type Plugin } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(async ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  const { viteTrpcPlugin } = await import('./src/server/vite-trpc-plugin.js')

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/client/routes',
        generatedRouteTree: './src/client/routeTree.gen.ts',
      }),
      viteReact(),
      tailwindcss(),
      viteTrpcPlugin(),
      {
        name: 'configure-server-timeout',
        configureServer(server) {
          server.httpServer?.setTimeout(120_000)
        },
      } satisfies Plugin,
    ],
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
    },
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
  }
})
