import { createStore } from '@/store/createStore'
import { settingsStore } from '@/store/settingsStore'
import { CUSTOMER_ACCENT_STORAGE_KEY, CUSTOMER_THEME_STORAGE_KEY, isStaffPath } from '@/store/storageKeys'
import { readJson, writeJson } from '@/store/storage'
import { ACCENTS, ACCENT_VAR_NAMES, DEFAULT_ACCENT_ID, accentVars } from './accents'

export const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** Oxirgi ochilishda saqlangan do'kon rangi — themeInit skripti ham shuni qo'llagan (noma'lum bo'lsa — standart rang). */
function storedCustomerAccent(): string {
  const stored = readJson(CUSTOMER_ACCENT_STORAGE_KEY)
  return typeof stored === 'string' && ACCENTS.some((accent) => accent.id === stored) ? stored : DEFAULT_ACCENT_ID
}

/** Mijoz header'dagi oy / quyosh tugmasi bilan tanlagan mavzu (tanlamagan bo'lsa — `null`). */
function storedCustomerDark(): boolean | null {
  const stored = readJson(CUSTOMER_THEME_STORAGE_KEY)
  return typeof stored === 'boolean' ? stored : null
}

/**
 * Mijoz ilovasining ko'rinishi: rang — admin sozlamasidan (do'kon rangi); mavzu — mijozning o'z tanlovi (`userDark`),
 * u bo'lmasa Telegram'dan (`telegramDark`), Telegram tashqarisida — qurilma mavzusi. CustomerLayout to'ldiradi.
 * Rang saqlangan nusxadan boshlanadi: CustomerLayout yuklanguncha themeInit qo'ygan rang standart rangga qaytib "miltillamasin".
 */
export const customerAppearance = createStore<{ accentId: string; telegramDark: boolean | null; userDark: boolean | null }>({
  accentId: storedCustomerAccent(),
  telegramDark: null,
  userDark: storedCustomerDark(),
})

/** Mijozning kunduzgi / tungi tanlovi — saqlanadi, keyingi ochilishda themeInit birinchi chizishdayoq qo'llaydi. */
export function setCustomerDark(userDark: boolean): void {
  customerAppearance.set({ ...customerAppearance.get(), userDark })
  writeJson(CUSTOMER_THEME_STORAGE_KEY, userDark)
}

export function setCustomerAccent(accentId: string): void {
  if (customerAppearance.get().accentId === accentId) return
  customerAppearance.set({ ...customerAppearance.get(), accentId })
  // keyingi ochilishda themeInit skripti birinchi chizishdan oldin qo'llaydi
  writeJson(CUSTOMER_ACCENT_STORAGE_KEY, accentId)
}

export function setTelegramDark(telegramDark: boolean | null): void {
  if (customerAppearance.get().telegramDark === telegramDark) return
  customerAppearance.set({ ...customerAppearance.get(), telegramDark })
}

function applyAccent(root: HTMLElement, accentId: string): void {
  const accent = ACCENTS.find((item) => item.id === accentId)
  ACCENT_VAR_NAMES.forEach((name) => root.style.removeProperty(name))
  if (!accent || accent.id === DEFAULT_ACCENT_ID) {
    root.removeAttribute('data-accent')
    return
  }
  root.setAttribute('data-accent', accent.id)
  Object.entries(accentVars(accent)).forEach(([name, value]) => root.style.setProperty(name, value))
}

/** themeInit.ts dagi skript bilan bir xil natija beradi — farqi faqat ilova ishlayotganda chaqirilishida. */
export function applyAppearance(): void {
  const root = document.documentElement
  if (isStaffPath(window.location.pathname)) {
    const { themeMode, accentId, lang } = settingsStore.get()
    root.classList.toggle('dark', themeMode === 'dark' || (themeMode === 'system' && systemDarkQuery.matches))
    applyAccent(root, accentId)
    // mijoz ilovasida <html lang> ni CustomerLayout o'zi qo'yadi
    root.lang = lang
  } else {
    const { accentId, telegramDark, userDark } = customerAppearance.get()
    root.classList.toggle('dark', userDark ?? telegramDark ?? systemDarkQuery.matches)
    applyAccent(root, accentId)
  }
}

/**
 * Sozlamalar, Telegram mavzusi, OS mavzusi yoki sahifa manzili (mijoz ↔ xodim qismi) o'zgarganda ko'rinishni
 * yangilab turadi. [subscribeToNavigation] — router'ga obuna.
 */
export function startAppearanceSync(subscribeToNavigation: (onNavigate: () => void) => void): void {
  applyAppearance()
  settingsStore.subscribe(applyAppearance)
  customerAppearance.subscribe(applyAppearance)
  systemDarkQuery.addEventListener('change', applyAppearance)
  subscribeToNavigation(applyAppearance)
}
