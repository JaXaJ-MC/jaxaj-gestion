import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En développement, les API sont servies sous la même origine que l'interface, comme en
// production : /comptes → appli comptes, /membres → API membres. Le cookie du jeton de
// renouvellement fonctionne ainsi sans CORS.
const COMPTES = process.env.COMPTES_URL ?? 'http://127.0.0.1:8000'
const MEMBRES = process.env.MEMBRES_URL ?? 'http://127.0.0.1:8001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    proxy: {
      '/comptes': { target: COMPTES, rewrite: (p) => p.replace(/^\/comptes/, '') },
      '/membres': { target: MEMBRES, rewrite: (p) => p.replace(/^\/membres/, '') },
    },
  },
})
