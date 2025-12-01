import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8000'),
    'import.meta.env.VITE_USE_MOCK_DATA': JSON.stringify('false'),
  },
  optimizeDeps: {
    force: true, // Force re-optimization of dependencies
  },
  server: {
    fs: {
      strict: false,
    },
  },
})