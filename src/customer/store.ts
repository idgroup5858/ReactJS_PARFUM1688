import type { ID, Lang } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { onStorageChange, readJson, writeJson } from '@/store/storage'
import { CUSTOMER_STORAGE_KEY } from '@/store/storageKeys'

/**
 * Mijoz qurilmasining holati (localStorage): til, profil, savat va sevimlilar. Server bilan bog'lanish — qurilma
 * tokeni (`token`): Telegram'dan ochilganda (`/shop/session`) yoki birinchi buyurtmada beriladi; "Мои заказы" shu
 * token bo'yicha serverdan olinadi. `customerId` — tokendagi mijoz (birinchi buyurtmadan keyin).
 */

export type CartKind = 'gram' | 'bottle'

/** gram — razliv (qty grammda), bottle — original flakon (qty donada) */
export type CartLine = { productId: ID; kind: CartKind; qty: number }

export interface CustomerState {
  lang: Lang
  name: string
  /** faqat raqamlar: "998901234567" */
  phone: string
  telegramId?: number
  customerId?: ID
  /** server bergan qurilma tokeni (`Authorization: Bearer`) */
  token?: string
  cart: CartLine[]
  favorites: ID[]
}

function sanitize(raw: unknown): CustomerState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof CustomerState, unknown>>
  const cart = Array.isArray(value.cart)
    ? value.cart.filter(
        (line): line is CartLine =>
          !!line &&
          typeof line === 'object' &&
          typeof (line as CartLine).productId === 'string' &&
          ((line as CartLine).kind === 'gram' || (line as CartLine).kind === 'bottle') &&
          typeof (line as CartLine).qty === 'number' &&
          (line as CartLine).qty > 0,
      )
    : []
  return {
    lang: value.lang === 'uz' ? 'uz' : 'ru',
    name: typeof value.name === 'string' ? value.name : '',
    phone: typeof value.phone === 'string' ? value.phone.replace(/\D/g, '') : '',
    telegramId: typeof value.telegramId === 'number' ? value.telegramId : undefined,
    customerId: typeof value.customerId === 'string' ? value.customerId : undefined,
    token: typeof value.token === 'string' ? value.token : undefined,
    cart,
    favorites: Array.isArray(value.favorites) ? value.favorites.filter((id): id is string => typeof id === 'string') : [],
  }
}

export const customerStore = createStore<CustomerState>(sanitize(readJson(CUSTOMER_STORAGE_KEY)))

// boshqa tabda (masalan, ikkinchi mijoz oynasida) o'zgargan savat shu yerda ham ko'rinadi
onStorageChange(CUSTOMER_STORAGE_KEY, () => customerStore.set(sanitize(readJson(CUSTOMER_STORAGE_KEY))))

export function useCustomer(): CustomerState {
  return useStore(customerStore)
}

function save(transform: (current: CustomerState) => CustomerState): void {
  const next = transform(customerStore.get())
  customerStore.set(next)
  writeJson(CUSTOMER_STORAGE_KEY, next)
}

export const setLang = (lang: Lang) => save((s) => ({ ...s, lang }))

export const setProfile = (name: string, phone: string) => save((s) => ({ ...s, name: name.trim(), phone: phone.replace(/\D/g, '') }))

/** Server bergan qurilma tokeni (buyurtmadan yoki Telegram sessiyasidan keyin) va unga bog'langan mijoz. */
export const setCustomerSession = (token: string, customerId: ID | undefined) =>
  save((s) => ({ ...s, token, customerId: customerId ?? s.customerId }))

/**
 * Telegram sessiyasi (`POST /shop/session`): token shu Telegram akkauntniki; server shu akkauntning mijozini tanisa —
 * uning id si, raqami (qurilmada bo'sh bo'lsa) ham. Boshqa qurilmadagi buyurtmalari ham "Мои заказы" da ko'rinadi.
 */
export const applyTelegramSession = (token: string, customer: { id: ID; phone: string } | null) =>
  save((s) => ({ ...s, token, customerId: customer?.id, phone: s.phone || customer?.phone.replace(/\D/g, '') || '' }))

/** Token yaroqsiz (server rad etdi) — "Мои заказы" bog'lanishi tushadi, keyingi buyurtmada yangisi beriladi. */
export const clearCustomerSession = () => save((s) => ({ ...s, token: undefined, customerId: undefined }))

export const customerToken = (): string | undefined => customerStore.get().token

/**
 * Telegram'dagi foydalanuvchi: id doim yangilanadi, ism faqat bo'sh bo'lsa to'ldiriladi. Shu qurilmada boshqa Telegram
 * akkaunt ochilsa — bu boshqa odam: oldingisining ismi, raqami va "Мои заказы" bog'lanishi (token) unga o'tmaydi.
 */
export const applyTelegramUser = (telegramId: number, name: string) =>
  save((s) => {
    if (s.telegramId === telegramId && s.name) return s
    if (s.telegramId !== undefined && s.telegramId !== telegramId) {
      return { ...s, telegramId, name, phone: '', customerId: undefined, token: undefined }
    }
    return { ...s, telegramId, name: s.name || name }
  })

const sameLine = (line: CartLine, productId: ID, kind: CartKind) => line.productId === productId && line.kind === kind

/** Savatga qo'shish: shu atirning shu turi bo'lsa — miqdori qo'shiladi. */
export function addToCart(productId: ID, kind: CartKind, qty: number): void {
  save((s) => {
    const existing = s.cart.find((line) => sameLine(line, productId, kind))
    const cart = existing
      ? s.cart.map((line) => (sameLine(line, productId, kind) ? { ...line, qty: line.qty + qty } : line))
      : [...s.cart, { productId, kind, qty }]
    return { ...s, cart }
  })
}

export function setCartQty(productId: ID, kind: CartKind, qty: number): void {
  save((s) => ({ ...s, cart: s.cart.map((line) => (sameLine(line, productId, kind) ? { ...line, qty } : line)) }))
}

export function removeFromCart(productId: ID, kind: CartKind): void {
  save((s) => ({ ...s, cart: s.cart.filter((line) => !sameLine(line, productId, kind)) }))
}

export const clearCart = () => save((s) => ({ ...s, cart: [] }))

export function toggleFavorite(productId: ID): void {
  save((s) => ({
    ...s,
    favorites: s.favorites.includes(productId) ? s.favorites.filter((id) => id !== productId) : [productId, ...s.favorites],
  }))
}
