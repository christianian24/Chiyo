import { defineConfig } from 'vite'
import path from 'node:path'
import { builtinModules } from 'node:module'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Externalize all dependencies and built-in modules
              external: [
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                ...Object.keys(pkg.dependencies || {}),
              ],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
  optimizeDeps: {
    exclude: ['better-sqlite3', 'sharp'],
  },
}))
