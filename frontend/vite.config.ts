import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(), 
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0', // Позволяет Docker пробрасывать порты
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Критично для Windows/macOS, чтобы изменения файлов подхватывались
    },
    hmr: {
      clientPort: 5173, // Гарантирует, что браузер стучится на правильный порт хоста
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
