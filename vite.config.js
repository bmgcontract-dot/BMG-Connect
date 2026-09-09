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
          // NOTE: recharts + its d3/lodash deps are intentionally NOT assigned a
          // manual chunk here. They are pulled in via React.lazy (ChartKit.jsx),
          // so Rollup emits them as an on-demand async chunk that is only fetched
          // when a chart first renders. Naming them here would make Vite eagerly
          // modulepreload the chunk on initial load and defeat the lazy split.
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
