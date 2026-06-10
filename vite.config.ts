import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'
import { handleDealAnalysisRequest } from './src/lib/server/dealAnalysisHandler'
import { handleDiscoveryRunHttp } from './src/lib/server/discoveryRunHandler'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

const readRequestBody = async (req: { on: Function }): Promise<string> => {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Uint8Array[] = []
    req.on('data', (chunk: Uint8Array | string) => {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk))
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => {
      resolveBody(Buffer.concat(chunks).toString('utf-8'))
    })
    req.on('error', (error: unknown) => {
      rejectBody(error)
    })
  })
}

const dealAnalysisDevMiddleware = (): PluginOption => ({
  name: 'deal-analysis-dev-middleware',
  apply: 'serve',
  configureServer(server) {
    // npm run dev uses this middleware for /api/deal-analysis.
    // Vercel production and `vercel dev` use api/deal-analysis.ts.
    // Both routes call the same shared server handler.
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url ?? '').split('?')[0]
      if (path !== '/api/deal-analysis') {
        next()
        return
      }

      try {
        const headers = new Headers()
        Object.entries(req.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers.set(key, value)
            return
          }

          if (Array.isArray(value)) {
            headers.set(key, value.join(','))
          }
        })

        const method = req.method ?? 'GET'
        const hasBody = method !== 'GET' && method !== 'HEAD'
        const bodyText = hasBody ? await readRequestBody(req as unknown as { on: Function }) : ''
        const request = new Request(`http://127.0.0.1:5000${req.url ?? '/api/deal-analysis'}`, {
          method,
          headers,
          body: hasBody ? bodyText : undefined,
        })

        const response = await handleDealAnalysisRequest(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })
        const payload = await response.text()
        res.end(payload)
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : 'Internal server error in Vite middleware.',
        }))
      }
    })
  },
})

const discoveryRunDevMiddleware = (): PluginOption => ({
  name: 'discovery-run-dev-middleware',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url ?? '').split('?')[0]
      if (path !== '/api/discovery/run') {
        next()
        return
      }

      console.log('[DISCOVERY ROUTE HIT]', {
        runtime: 'vite-dev-middleware',
        method: req.method ?? 'UNKNOWN',
        url: req.url ?? '/api/discovery/run',
      })

      try {
        const method = req.method ?? 'GET'
        const hasBody = method !== 'GET' && method !== 'HEAD'
        const bodyText = hasBody ? await readRequestBody(req as unknown as { on: Function }) : ''

        let parsedBody: unknown = undefined
        if (hasBody) {
          try {
            parsedBody = bodyText ? JSON.parse(bodyText) : {}
          } catch {
            parsedBody = {}
          }
        }

        const { status, body } = await handleDiscoveryRunHttp(method, parsedBody)

        res.statusCode = status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(body))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error in Vite middleware.',
        }))
      }
    })
  },
})

const syncDiscoveryEnv = (env: Record<string, string>) => {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'WEB_SEARCH_API_KEY',
    'VITE_WEB_SEARCH_PROVIDER',
  ]

  for (const key of keys) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key]
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')

  if (mode === 'development') {
    syncDiscoveryEnv(env)
  }

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      dealAnalysisDevMiddleware(),
      discoveryRunDevMiddleware(),
      react(),
      tailwindcss(),
      // DO NOT REMOVE
      createIconImportProxy() as PluginOption,
      sparkPlugin() as PluginOption,
    ],
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
    },
  }
})
