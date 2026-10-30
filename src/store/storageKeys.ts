// vite.config.ts → theme/themeInit.ts ham shu faylni import qiladi (Node muhitida) — boshqa import qilmasin

/** Xodim qurilmasi sozlamalari: mavzu va asosiy rang (kassa / admin). v2 — standart rang zumrad bo'lganda eski "bordo" qolmasin */
export const SETTINGS_STORAGE_KEY = 'parfum1688.settings.v2'
/** Mijoz ilovasi rangi — admin sozlamasidan nusxa, birinchi chizishda o'qiladi */
export const CUSTOMER_ACCENT_STORAGE_KEY = 'parfum1688.customerAccent'
/** Mijoz o'zi tanlagan mavzu: true — tungi, false — kunduzgi; yo'q bo'lsa Telegram / qurilma mavzusi */
export const CUSTOMER_THEME_STORAGE_KEY = 'parfum1688.customerTheme'
/** Mijoz qurilmasi: profil, til, savat, sevimlilar, server bergan qurilma tokeni */
export const CUSTOMER_STORAGE_KEY = 'parfum1688.customer'
/** Kirgan xodim: token va xodim — har bir tabning o'zida (sessionStorage) */
export const SESSION_STORAGE_KEY = 'parfum1688.session'

/**
 * Backend'gacha bo'lgan kalitlar: butun "baza", Telegram bot holati (token bilan!) va tablar yetakchisi — endi
 * serverda. Brauzerda qolib ketmasin (main.tsx ilova ochilganda o'chiradi).
 */
export const LEGACY_STORAGE_KEYS = ['parfum1688.db', 'parfum1688.telegram', 'parfum1688.telegramLeader']

/** Xodimlar qismi manzillari — qolgan hammasi mijoz ilovasi. */
export const STAFF_PATH_PREFIXES = ['/admin', '/kassa', '/login']

export function isStaffPath(pathname: string): boolean {
  return STAFF_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
