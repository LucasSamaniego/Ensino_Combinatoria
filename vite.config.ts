import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração original para desenvolvimento React
export default defineConfig({
  plugins: [react()],
  // Garante caminhos relativos no build (essencial para hospedagem compartilhada)
  base: './',
  define: {
    // Garante que seja uma string vazia caso a env var não exista no build time
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
})