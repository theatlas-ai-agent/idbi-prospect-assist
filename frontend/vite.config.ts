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
  server: {
    proxy: {
      '/score': 'http://localhost:5000',
      '/batch': 'http://localhost:5000',
      '/leads': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
    },
  },
})
