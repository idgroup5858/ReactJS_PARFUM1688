import sdk from '@twa-dev/sdk'
import { useEffect, useRef } from 'react'
import { http } from '@/api/http'
import { setTelegramDark } from '@/theme/appearance'
import { applyTelegramSession, applyTelegramUser } from './store'

/**
 * Telegram Mini App bilan ishlash. Faqat mijoz ilovasida import qilinadi (kassa/admin bo'laklariga tushmaydi).
 * Telegram tashqarisida (oddiy brauzer) `initData` bo'sh — hamma funksiya jim o'tib ketadi.
 */

type TelegramWebApp = typeof sdk

/**
 * @twa-dev/sdk — CommonJS paket (`exports.default = WebApp`). Ilovada "type": "module" bo'lgani uchun Vite (dev ham,
 * build ham) default import o'rniga butun `exports` obyektini beradi — haqiqiy WebApp uning `.default` ida.
 * Ikkala holatda ham to'g'ri ishlashi uchun ochib olamiz.
 */
const WebApp: TelegramWebApp = (sdk as TelegramWebApp & { default?: TelegramWebApp }).default ?? sdk

export const inTelegram = Boolean(WebApp.initData)

const supports = (version: string) => inTelegram && WebApp.isVersionAtLeast(version)

let started = false

/** Ilova ochilganda bir marta: tayyor signali, to'liq ekran, mavzu va foydalanuvchi. */
export function startTelegram(): void {
  if (started || !inTelegram) return
  started = true
  WebApp.ready()
  WebApp.expand()
  // pastga skroll qilganda ilova yopilib qolmasin
  if (supports('7.7')) WebApp.disableVerticalSwipes()
  const applyTheme = () => setTelegramDark(WebApp.colorScheme === 'dark')
  applyTheme()
  WebApp.onEvent('themeChanged', applyTheme)
  const user = WebApp.initDataUnsafe.user
  if (!user) return
  applyTelegramUser(user.id, [user.first_name, user.last_name].filter(Boolean).join(' '))
  // server imzoni tekshirib qurilma tokenini beradi; bo'lmasa (bot ulanmagan, tarmoq) — tokensiz ham buyurtma beriladi
  http
    .post<{ token: string; customer: { id: string; phone: string } | null }>('/shop/session', { initData: WebApp.initData }, { token: null })
    .then((session) => applyTelegramSession(session.token, session.customer))
    .catch((error: unknown) => console.warn('Telegram sessiyasi ochilmadi:', error))
}

/** Savatga qo'shilganda va h.k. — yengil tebranish. */
export function haptic(kind: 'light' | 'success' | 'error' = 'light'): void {
  if (!supports('6.1')) return
  if (kind === 'light') WebApp.HapticFeedback.impactOccurred('light')
  else WebApp.HapticFeedback.notificationOccurred(kind)
}

/** Telegram'ning o'z "orqaga" tugmasi: ichki sahifalarda ko'rinadi. */
export function useTelegramBackButton(visible: boolean, onBack: () => void): void {
  const handler = useRef(onBack)
  useEffect(() => {
    handler.current = onBack
  })
  useEffect(() => {
    if (!supports('6.1')) return
    const click = () => handler.current()
    if (visible) {
      WebApp.BackButton.show()
      WebApp.BackButton.onClick(click)
    } else {
      WebApp.BackButton.hide()
    }
    return () => {
      WebApp.BackButton.offClick(click)
    }
  }, [visible])
}
