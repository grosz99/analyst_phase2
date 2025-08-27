import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: (id) => {
        // Exclude problematic optional dependencies from bundling
        return id.includes('@rollup/rollup-linux') || 
               id.includes('@rollup/rollup-win32') || 
               id.includes('@rollup/rollup-darwin')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          ui: ['lucide-react']
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
    force: true
  },
  define: {
    global: 'globalThis',
  }
})
