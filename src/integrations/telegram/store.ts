import { useSyncExternalStore } from 'react'
import { errorText } from '@/api/errors'
import { http } from '@/api/http'
import { stripNulls } from '@/data/db'
import type { Lang } from '@/domain/types'
import AppSwal from '@/lib/swal'
import { tr } from '@/staff/i18n'
import { createStore } from '@/store/createStore'
import type { TgBotCommand, TgBotInfo, TgMenuButton } from './api'

/**
 * Telegram bot integratsiyasi (Admin → Sozlamalar → Integratsiya). Bot serverda ishlaydi — token, yangilanishlar,
 * obunachilar, xabarlar va rassilka backendda (`/api/telegram/*`); bu yerda faqat ularning nusxasi. Server
 * `changed: telegram` yuborsa qayta olinadi (TelegramIntegration).
 */

/** Bot holati va sozlamalari (token o'zi qaytmaydi — faqat `tokenHint`). */
export interface TelegramStatus {
  connected: boolean
  tokenHint?: string
  bot?: TgBotInfo
  connectedAt?: string
  /** yangilanishlarni qabul qilish yoqilganmi */
  polling: boolean
  /** server hozir yangilanishlarni olayaptimi */
  running: boolean
  lastPollAt?: string
  lastError?: string
  /** botda webhook o'rnatilgan bo'lsa — server yangilanishlarni ola olmaydi */
  webhookUrl?: string
  miniAppUrl: string
  menuButtonText: string
  welcome: { enabled: boolean; ru: string; uz: string; buttonRu: string; buttonUz: string }
  notify: { customers: boolean; staff: boolean; staffChatId: string; staffLang: Lang }
}

/** Botga /start bosgan yoki yozgan foydalanuvchi. */
export interface Subscriber {
  /** Telegram user id (shaxsiy chat id si ham shu) */
  id: number
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
  firstSeen: string
  lastSeen: string
  /** blocked — foydalanuvchi botni to'xtatgan (xabar yuborib bo'lmaydi) */
  status: 'active' | 'blocked'
  messages: number
}

export interface InboxMessage {
  id: string
  chatId: number
  direction: 'in' | 'out'
  /** kimdan / kimga (ism) */
  name: string
  text: string
  at: string
}

export type Audience = 'all' | 'buyers' | 'ru' | 'uz'

export interface BroadcastRecord {
  id: string
  at: string
  text: string
  audience: Audience
  total: number
  sent: number
  failed: number
  blocked: number
  status: 'running' | 'done' | 'stopped'
}

export interface TelegramData {
  status: TelegramStatus
  subscribers: Subscriber[]
  inbox: InboxMessage[]
  broadcasts: BroadcastRecord[]
}

/** "Xabarlar" bo'limida ko'rsatiladigan oxirgi xabarlar soni. */
export const INBOX_LIMIT = 500

const store = createStore<TelegramData | null>(null)

export function useTelegram(): TelegramData | null {
  return useSyncExternalStore(store.subscribe, store.get)
}

let inflight: Promise<void> | null = null
let again = false

async function fetchTelegram(): Promise<TelegramData> {
  const [status, subscribers, inbox, broadcasts] = await Promise.all([
    http.get<TelegramStatus>('/telegram'),
    http.get<Subscriber[]>('/telegram/subscribers'),
    http.get<InboxMessage[]>('/telegram/messages', { limit: INBOX_LIMIT }),
    http.get<BroadcastRecord[]>('/telegram/broadcasts'),
  ])
  return stripNulls({ status, subscribers, inbox, broadcasts })
}

/** Serverdan qayta oladi (bir vaqtda bir nechta chaqiruv — bitta so'rov, oxirida yana bir marta). */
export function refreshTelegram(): Promise<void> {
  if (inflight) {
    again = true
    return inflight
  }
  inflight = (async () => {
    do {
      again = false
      try {
        store.set(await fetchTelegram())
      } catch (error) {
        console.warn('Telegram holati olinmadi:', error)
      }
    } while (again)
  })().finally(() => {
    inflight = null
  })
  return inflight
}

/**
 * Bot amali (serverga): bajariladi, holat qayta olinadi. Xato bo'lsa — oyna (Telegram'ning o'z sababi bilan) va `null`.
 */
export async function telegramAction<T>(work: () => Promise<T>, title = tr('Telegram xatosi', 'Ошибка Telegram')): Promise<T | null> {
  try {
    const result = await work()
    await refreshTelegram()
    return result
  } catch (error) {
    void AppSwal.fire({ icon: 'error', title, text: errorText(error) })
    return null
  }
}

export type TelegramSettingsPatch = Partial<Pick<TelegramStatus, 'miniAppUrl' | 'menuButtonText' | 'polling'>> & {
  clearError?: boolean
  welcome?: Partial<TelegramStatus['welcome']>
  notify?: Partial<TelegramStatus['notify']>
}

export interface BotProfile {
  commands: TgBotCommand[]
  description: string
  shortDescription: string
  menuButton: TgMenuButton
}

/** Server endpointlari (`/api/telegram/*`, faqat admin). */
export const telegramApi = {
  connect: (token: string) => http.post('/telegram/connect', { token }),
  refresh: () => http.post('/telegram/refresh'),
  disconnect: () => http.post('/telegram/disconnect'),
  deleteWebhook: () => http.post('/telegram/delete-webhook'),
  updateSettings: (patch: TelegramSettingsPatch) => http.patch('/telegram/settings', patch),
  profile: () => http.get<BotProfile>('/telegram/profile'),
  setCommands: (commands: TgBotCommand[]) => http.put('/telegram/commands', { commands }),
  setDescription: (description: string, shortDescription: string) => http.put('/telegram/description', { description, shortDescription }),
  setMenuButton: (button: { type: 'web_app'; text: string; url: string } | { type: 'commands' }) => http.put('/telegram/menu-button', button),
  send: (chatId: number | string, text: string) => http.post('/telegram/messages', { chatId: String(chatId), text }),
  startBroadcast: (body: { text: string; audience: Audience; withButton: boolean; buttonText: string }) =>
    http.post<BroadcastRecord>('/telegram/broadcasts', body),
  testBroadcast: (body: { text: string; withButton: boolean; buttonText: string }) => http.post('/telegram/broadcasts/test', body),
  stopBroadcast: (id: string) => http.post(`/telegram/broadcasts/${id}/stop`),
}

export function subscriberName(subscriber: Pick<Subscriber, 'firstName' | 'lastName'>): string {
  return [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ')
}

/** Xabarlar tili: o'zbekcha Telegram — o'zbekcha, qolganlari — ruscha (mijoz ilovasining asosiy tili). */
export function subscriberLang(languageCode: string | undefined): 'ru' | 'uz' {
  return languageCode?.toLowerCase().startsWith('uz') ? 'uz' : 'ru'
}
