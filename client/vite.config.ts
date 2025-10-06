import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
    },
  },
})
