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
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Do not exclude platform-specific dependencies - let them resolve naturally
      output: {
        manualChunks: (id) => {
          // Vendor chunk for React and related packages
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor';
          }
          // Charts chunk for visualization libraries
          if (id.includes('chart.js') || id.includes('recharts') || id.includes('react-chartjs-2')) {
            return 'charts';
          }
          // UI chunk for UI components
          if (id.includes('lucide-react') || id.includes('tailwind')) {
            return 'ui';
          }
          // Supabase chunk
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          // Node modules chunk for other dependencies
          if (id.includes('node_modules')) {
            return 'libs';
          }
        },
        // Ensure proper chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Optimize for Vercel deployment
      treeshake: {
        moduleSideEffects: false
      },
      // Handle external dependencies properly
      external: [],
      // Explicitly configure platform for Linux x64
      plugins: []
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/]
    },
    // Optimize for production builds
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@supabase/supabase-js',
      'chart.js',
      'react-chartjs-2',
      'recharts',
      'lucide-react',
      'file-saver',
      'html2canvas'
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  // Resolve configuration for better module resolution
  resolve: {
    alias: {
      '@': '/src'
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  // Environment-specific configuration
  envPrefix: ['VITE_', 'REACT_APP_'],
  // CSS configuration
  css: {
    postcss: './postcss.config.js'
  }
})
