import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Vite configuration
export default defineConfig({
  plugins: [react()],
  
  css: {
    postcss: './postcss.config.js',
  },

  // ✅ Proxy API requests to backend
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // Your Express backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
