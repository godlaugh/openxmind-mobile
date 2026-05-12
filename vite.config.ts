import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import pkg from './package.json'

let gitHash = 'dev'
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/openxmind-mobile/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__:  JSON.stringify(new Date().toISOString()),
    __GIT_HASH__:    JSON.stringify(gitHash),
  },
})
