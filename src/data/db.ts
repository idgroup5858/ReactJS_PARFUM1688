import { useSyncExternalStore } from 'react'
import { errorText } from '@/api/errors'
import { ApiError, http } from '@/api/http'
import { clearCustomerSession, customerStore } from '@/customer/store'
import type { Brand, Db, Flakon, ID, Order, Product, ShopSettings, StockBalance, StockKey } from '@/domain/types'
import AppSwal from '@/lib/swal'
import { tr } from '@/staff/i18n'
import { createStore } from '@/store/createStore'

/**
 * Serverdagi baza nusxasi (NestJS_PARFUM1688). Sahifalar avvalgidek o'qiydi:
 *   const db = useDb()   (komponentda)   ·   getDb()   (oddiy funksiyada)
 * Ikki ko'rinish:
 *   - `staff` (kassa, admin) — `GET /api/snapshot`: butun baza (kassirga — tannarx va moliyasiz);
 *   - `shop` (mijoz ilovasi) — `GET /api/shop/catalog` + o'z buyurtmalari (`GET /api/shop/orders`).
 * O'zgartirish — REST orqali: `commit(() => http.post(...))` — so'rov, keyin baza qayta olinadi; xato bo'lsa xodimga
 * oyna chiqadi. Boshqa ekranlardagi o'zgarishlar socket orqali keladi (components/DataGate → refreshDb).
 */

export type DbMode = 'staff' | 'shop'

/** Mijoz katalogidagi qo'shimchalar (atir id → ...): oxirgi 30 kun sotuvi ("Хиты продаж") va reyting. */
export interface ShopMeta {
  sales: Map<ID, number>
  ratings: Map<ID, { average: number; count: number }>
}

interface DbState {
  mode: DbMode | null
  db: Db
  ready: boolean
  error: ApiError | null
  shop: ShopMeta
}

const DEFAULT_SETTINGS: ShopSettings = {
  name: 'PARFUM1688',
  phone: '',
  address: '',
  customerAccentId: 'emerald',
  minGrams: 50,
  gramChips: [50, 100, 200, 500],
  lowStockGrams: 300,
  lowStockPieces: 3,
  receiptFooter: '',
}

export const EMPTY_DB: Db = {
  settings: DEFAULT_SETTINGS,
  users: [],
  brands: [],
  categories: [],
  notes: [],
  accords: [],
  products: [],
  flakons: [],
  stock: {},
  movements: [],
  suppliers: [],
  purchases: [],
  supplierPayments: [],
  inventories: [],
  writeOffs: [],
  expenseCategories: [],
  expenses: [],
  customers: [],
  orders: [],
  reviews: [],
  banners: [],
  counters: { order: 1000, purchase: 0, inventory: 0, writeOff: 0 },
}

const EMPTY_META: ShopMeta = { sales: new Map(), ratings: new Map() }

const store = createStore<DbState>({ mode: null, db: EMPTY_DB, ready: false, error: null, shop: EMPTY_META })

const selectDb = () => store.get().db

export function useDb(): Db {
  return useSyncExternalStore(store.subscribe, selectDb)
}

export function getDb(): Db {
  return store.get().db
}

/** Yuklanish holati (DataGate uchun). */
export function useDbState(): DbState {
  return useSyncExternalStore(store.subscribe, store.get)
}

const selectShop = () => store.get().shop

export function useShopMeta(): ShopMeta {
  return useSyncExternalStore(store.subscribe, selectShop)
}

/**
 * Server ixtiyoriy maydonlarni `null` qilib beradi, frontend turlari esa `undefined` kutadi (`order.payment ?? ...`,
 * `line.unitCost === undefined`). `bottle` — istisno: "faqat razliv" atirda u aynan `null`.
 */
export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripNulls) as T
  if (value === null || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === null && key !== 'bottle') continue
    result[key] = stripNulls(item)
  }
  return result as T
}

// ───────────────────────── yuklash ─────────────────────────

type ShopProduct = Product & { available: { grams: number; bottles: number }; rating: { average: number; count: number }; sales30d: number }

interface ShopCatalog {
  settings: Partial<ShopSettings>
  brands: Brand[]
  categories: Db['categories']
  notes: Db['notes']
  accords: Db['accords']
  flakons: Flakon[]
  products: ShopProduct[]
  banners: Db['banners']
}

async function fetchStaff(): Promise<Pick<DbState, 'db' | 'shop'>> {
  const snapshot = stripNulls(await http.get<Partial<Db>>('/snapshot'))
  return { db: { ...EMPTY_DB, ...snapshot, settings: { ...DEFAULT_SETTINGS, ...snapshot.settings } }, shop: EMPTY_META }
}

/** Mijoz buyurtmalari (token bo'lsa). Token yaroqsiz bo'lsa — tashlab yuboriladi, buyurtmalar bo'sh. */
async function fetchMyOrders(): Promise<Order[]> {
  const token = customerStore.get().token
  if (!token) return []
  try {
    const orders = await http.get<(Omit<Order, 'stockApplied'> & { stockApplied?: boolean })[]>('/shop/orders', undefined, { token })
    const customerId = customerStore.get().customerId
    return orders.map((order) => ({
      ...order,
      customerId,
      stockApplied: order.status === 'ready' || order.status === 'done',
    }))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearCustomerSession()
      return []
    }
    throw error
  }
}

async function fetchShop(): Promise<Pick<DbState, 'db' | 'shop'>> {
  const [catalog, orders] = await Promise.all([http.get<ShopCatalog>('/shop/catalog', undefined, { token: null }), fetchMyOrders()])
  const data = stripNulls(catalog)
  const stock: Record<StockKey, StockBalance> = {}
  const sales = new Map<ID, number>()
  const ratings = new Map<ID, { average: number; count: number }>()
  const products = data.products.map(({ available, rating, sales30d, ...product }) => {
    stock[`gram:${product.id}`] = { qty: available.grams, avgCost: 0 }
    stock[`bottle:${product.id}`] = { qty: available.bottles, avgCost: 0 }
    sales.set(product.id, sales30d)
    ratings.set(product.id, rating)
    return product
  })
  return {
    db: {
      ...EMPTY_DB,
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      brands: data.brands,
      categories: data.categories,
      notes: data.notes,
      accords: data.accords,
      flakons: data.flakons,
      products,
      banners: data.banners,
      stock,
      orders: stripNulls(orders),
    },
    shop: { sales, ratings },
  }
}

let inflight: Promise<void> | null = null
let again = false

async function load(mode: DbMode): Promise<void> {
  try {
    const data = mode === 'staff' ? await fetchStaff() : await fetchShop()
    // yuklanayotganda boshqa ko'rinishga o'tilgan bo'lsa (chiqish, mijoz ilovasiga o'tish) — eski javob kerak emas
    if (store.get().mode !== mode) return
    store.set({ mode, ready: true, error: null, ...data })
  } catch (error) {
    if (store.get().mode !== mode) return
    const apiError = error instanceof ApiError ? error : new ApiError(0, 'unknown', String(error))
    // allaqachon yuklangan bo'lsa — eski ma'lumot qoladi (vaqtinchalik uzilish), birinchi yuklashda — xato ekrani
    store.set({ ...store.get(), error: store.get().ready ? null : apiError })
    if (store.get().ready) console.warn('Baza yangilanmadi:', apiError.message)
  }
}

/** Ko'rinishni tanlaydi va yuklaydi (boshqa ko'rinishdan o'tilsa — eski ma'lumot tozalanadi). */
export function openDb(mode: DbMode): Promise<void> {
  if (store.get().mode !== mode) {
    store.set({ mode, db: EMPTY_DB, ready: false, error: null, shop: EMPTY_META })
    inflight = null
  }
  return refreshDb()
}

/** Joriy ko'rinishni qayta oladi. Yuklash davom etayotgan bo'lsa — tugagach yana bir marta (oxirgi holat bilan). */
export function refreshDb(): Promise<void> {
  const mode = store.get().mode
  if (!mode) return Promise.resolve()
  if (inflight) {
    again = true
    return inflight
  }
  inflight = (async () => {
    do {
      again = false
      await load(mode)
    } while (again && store.get().mode === mode)
  })().finally(() => {
    inflight = null
  })
  return inflight
}

/** Chiqishda: xodim ma'lumoti xotirada qolmasin. */
export function closeDb(): void {
  store.set({ mode: null, db: EMPTY_DB, ready: false, error: null, shop: EMPTY_META })
  inflight = null
}

// ───────────────────────── o'zgartirish ─────────────────────────

/** Server xatosi — xodimga oyna (xodim tilida). */
export function showApiError(error: unknown, title = tr("Saqlab bo'lmadi", 'Не удалось сохранить')): void {
  void AppSwal.fire({ icon: 'error', title, text: errorText(error) })
}

/**
 * Serverga o'zgartirish: [work] (REST so'rov) → baza qayta olinadi → natija. Xato bo'lsa xodimga oyna chiqadi va
 * `null` qaytadi (204 javobda natija `undefined` — muvaffaqiyat): `if ((await commit(...)) === null) return`.
 * [onError] — xatoni o'zi ko'rsatmoqchi bo'lgan joy uchun (`true` qaytarsa standart oyna chiqmaydi).
 */
export async function commit<T>(work: () => Promise<T>, onError?: (error: ApiError) => boolean | void): Promise<T | null> {
  try {
    const result = await work()
    await refreshDb()
    return result
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(0, 'unknown', String(error))
    if (!onError?.(apiError)) showApiError(apiError)
    // xato holat (masalan, boshqa kassir allaqachon o'zgartirgan) — ekran serverdagi haqiqiy holatni ko'rsatsin
    void refreshDb()
    return null
  }
}
