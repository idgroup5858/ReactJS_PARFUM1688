import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { buildThemeInitScript } from './src/theme/themeInit.ts'

/**
 * Saqlangan mavzu va asosiy rangni birinchi chizishdan oldin <html> ga qo'yadi, shunda sahifa standart ranglarda
 * "lip" etib ko'rinmaydi (ReactJS_Language dagi theme-init bilan bir xil yondashuv).
 */
function themeInit(): Plugin {
  return {
    name: 'parfum1688-theme-init',
    transformIndexHtml: (html) => html.replace('<!--theme-init-->', `<script>${buildThemeInitScript()}</script>`),
  }
}

/** Backend (C:\BACKEND APPS\NestJS_PARFUM1688, 3001): API, Socket.IO va admin yuklagan rasmlar. */
const BACKEND = 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), themeInit()],
  // 5173 — ReactJS_NYFF, 5174 — ReactJS_HR_System, 5175 — ReactJS_Language
  // tayyor ilovani backend o'zi beradi (UI_DIST) — manzillar nisbiy
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/socket.io': { target: BACKEND, ws: true, changeOrigin: true },
      '/images': { target: BACKEND, changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
