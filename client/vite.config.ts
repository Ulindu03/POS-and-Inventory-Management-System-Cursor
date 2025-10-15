import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs/promises'

// Dev-only plugin to strip missing source map references from lucide-react ESM files
function stripLucideSourceMaps() {
  const iconFileRe = /node_modules[\\\/]lucide-react[\\\/]dist[\\\/]esm[\\\/]icons[\\\/].+\.js$/
  const hasMapRe = /sourceMappingURL=/
  const strip = (code: string) => {
    if (!hasMapRe.test(code)) return null
    let cleaned = code.replace(/\/\/[#][\t ]*sourceMappingURL=.*$/gm, '')
    cleaned = cleaned.replace(/\/\*#\s*sourceMappingURL=[\s\S]*?\*\//gm, '')
    return cleaned
  }
  return {
    name: 'strip-lucide-sourcemaps',
    apply: 'serve' as const,
    enforce: 'pre' as const,
    // Intercept reads for lucide icon ESM files and strip inline source maps
    async load(id: string) {
      const bareId = id.split('?')[0]
      if (!iconFileRe.test(bareId)) return null
      try {
        const buf = await fs.readFile(bareId, 'utf8')
        const cleaned = strip(buf)
        return cleaned ? { code: cleaned, map: null } : null
      } catch {
        return null
      }
    },
    transform(code: string, id: string) {
      // Vite appends query (?v=hash) to dependency ids; strip it for pattern test
      const bareId = id.split('?')[0]
      if (!iconFileRe.test(bareId)) return null
      const cleaned = strip(code)
      return cleaned ? { code: cleaned, map: null } : null
    }
  }
}

export default defineConfig({
  plugins: [react(), stripLucideSourceMaps()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@components', replacement: path.resolve(__dirname, './src/components') },
      { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: '@lib', replacement: path.resolve(__dirname, './src/lib') },
      { find: '@types', replacement: path.resolve(__dirname, './src/types') },
      { find: '@assets', replacement: path.resolve(__dirname, './src/assets') },
      { find: '@store', replacement: path.resolve(__dirname, './src/store') },
      { find: '@services', replacement: path.resolve(__dirname, './src/services') },
  // Map deep icon imports to the actual node_modules path to avoid index scan
  { find: /^lucide-react\/dist\/esm\/icons\/(.+)$/, replacement: path.resolve(__dirname, './node_modules/lucide-react/dist/esm/icons') + '/$1' },
  // Exact-match only: redirect bare lucide-react imports to our safe wrapper
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, './src/lib/safe-lucide-react.ts') },
      { find: /^lucide-react\/dist\/esm\/lucide-react(\.js)?$/, replacement: path.resolve(__dirname, './src/lib/safe-lucide-react.ts') },
      // Workaround: Defender flags chrome icon file; force it to resolve to a safe stub
      { find: /^lucide-react\/dist\/esm\/icons\/chrome(\.js)?$/, replacement: path.resolve(__dirname, './src/lib/icon-stubs/chrome.js') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.IO websocket endpoint to backend so ws://localhost:5173/socket.io works in dev
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
