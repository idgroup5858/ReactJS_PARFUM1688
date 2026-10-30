import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/cormorant-garamond/index.css'
import '@fontsource-variable/bodoni-moda/index.css'
import './styles/global.css'
// xodim tokeni HTTP so'rovlarga birinchi so'rovdan oldin ulanadi (configureHttp)
import './app/session'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './app/router'
import { LEGACY_STORAGE_KEYS } from './store/storageKeys'
import { startAppearanceSync } from './theme/appearance'

// backend'gacha brauzerda saqlangan baza va bot tokeni — endi serverda, nusxasi qolmasin
try {
  for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key)
} catch {
  // saqlash bloklangan — o'chiradigan narsa ham yo'q
}

// mijoz ilovasi ↔ xodimlar qismi o'tganda mavzu va rang yangi manzilga moslanadi
startAppearanceSync((update) => router.subscribe(update))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
