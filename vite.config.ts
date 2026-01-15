import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração original para desenvolvimento React
export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que seja uma string vazia caso a env var não exista no build time
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
})