import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração original para desenvolvimento React
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})