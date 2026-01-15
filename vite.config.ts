import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual.
  // O terceiro parâmetro '' diz para carregar TODAS as variáveis, 
  // permitindo ler 'API_KEY' mesmo sem o prefixo 'VITE_'.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: './',
    define: {
      // Substitui 'process.env.API_KEY' pelo valor real da string durante o build
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || "")
    }
  }
})