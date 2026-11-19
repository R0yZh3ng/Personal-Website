import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// BASE is set by the Pages workflow (project sites live under /<repo>/); '/' everywhere else, e.g. a custom domain.
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [react()],
})
