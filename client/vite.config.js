import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // React app runs on 5173
    proxy: {
      // Forward requests starting with /api to Express on 5000
      '/api': {
        target: 'http://localhost:5000', // <-- Express API Port
        changeOrigin: true, // Needed for virtual hosting
        secure: false, 
      },
      // Forward uploaded files to backend so /uploads/filename works in dev
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // keep path as-is
      }
    }
  }
})
