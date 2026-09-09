import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/') || id.includes('/@firebase/')) {
            return 'firebase'
          }
          if (
            id.includes('/recharts/') ||
            id.includes('/recharts-scale/') ||
            id.includes('/react-smooth/') ||
            id.includes('/lodash/') ||
            id.includes('/decimal.js-light/') ||
            /\/d3-[^/]+\//.test(id)
          ) {
            return 'charts'
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/lucide-react/')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
})
