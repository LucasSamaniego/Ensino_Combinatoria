import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração para desenvolvimento React com Vite
export default defineConfig({
  plugins: [react()],
  // Garante caminhos relativos no build (essencial para hospedagem compartilhada como Hostinger)
  base: './'
})