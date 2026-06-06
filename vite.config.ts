import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'
import dealAnalysisHandler from './api/deal-analysis'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

const createDevDealAnalysisMiddleware = (): PluginOption => ({
  name: 'dev-deal-analysis-middleware',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        const incomingUrl = req.url ?? '/'
        const url = new URL(incomingUrl, `http://${req.headers.host ?? 'localhost:5000'}`)

        if (url.pathname !== '/api/deal-analysis') {
          next()
          return
        }

        const method = (req.method ?? 'GET').toUpperCase()
        const rawBody = await new Promise<string>((resolveBody, rejectBody) => {
          const chunks: Uint8Array[] = []
          req.on('data', (chunk) => {
            if (typeof chunk === 'string') {
              chunks.push(Buffer.from(chunk))
            } else {
              chunks.push(chunk)
            }
          })
          req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf-8')))
          req.on('error', rejectBody)
        })

        const request = new Request(url.toString(), {
          method,
          headers: req.headers as HeadersInit,
          body: method === 'GET' || method === 'HEAD' ? undefined : rawBody,
        })

        const response = await dealAnalysisHandler(request)

        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })

        const responseText = await response.text()
        res.end(responseText)
      } catch (error) {
        console.error('[dev-deal-analysis-middleware] fatal', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'Local middleware error.' }))
      }
    })
  },
})

// https://vite.dev/config/
// NOTE: /api/deal-analysis is now a Vercel Serverless Function at api/deal-analysis.ts
// For local development with the API route, run: vercel dev
// Plain `vite` / `npm run dev` serves the frontend only (API calls will 404 unless proxied).
export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    createDevDealAnalysisMiddleware() as PluginOption,
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
})
