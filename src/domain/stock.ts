import { tr } from '@/staff/i18n'
import type { Db, ID, StockBalance, StockKey, StockKind } from './types'

/**
 * Ombor qoldig'i (o'qish va ko'rsatish). Kirim, chiqim, sanoq va o'rtacha tannarx — serverda (NestJS_PARFUM1688
 * `StockService`); bu yerda faqat nusxadagi qoldiqdan hisoblanadigan narsalar. Qoldiq manfiy bo'lishi mumkin — kassa
 * va admin oldindan [shortages] bilan ogohlantiradi.
 */

export function stockKey(kind: StockKind, id: ID): StockKey {
  return `${kind}:${id}`
}

export function parseStockKey(key: StockKey): { kind: StockKind; id: ID } {
  const index = key.indexOf(':')
  return { kind: key.slice(0, index) as StockKind, id: key.slice(index + 1) }
}

export function balanceOf(db: Db, key: StockKey): StockBalance {
  return db.stock[key] ?? { qty: 0, avgCost: 0 }
}

/** O'lchov birligi: razliv — gramm, original flakon va tara — dona. */
export function stockUnit(key: StockKey): 'g' | 'dona' {
  return parseStockKey(key).kind === 'gram' ? 'g' : 'dona'
}

/** Pozitsiya egasi (atir yoki tara) katalogda bormi. */
function ownerExists(db: Db, key: StockKey): boolean {
  const { kind, id } = parseStockKey(key)
  return kind === 'flakon' ? db.flakons.some((flakon) => flakon.id === id) : db.products.some((product) => product.id === id)
}

/**
 * Ombordagi barcha pozitsiyalar: har atirning razlivi, original flakoni (sotilsa) va taralar. Original sotuvdan
 * olingan (`bottle: null`) atirning omborda qolgan (yoki manfiy) flakonlari ham kiradi — ularni sanash, spisanie
 * qilish va qiymatini ko'rish mumkin bo'lishi kerak.
 */
export function allStockKeys(db: Db): StockKey[] {
  const keys: StockKey[] = []
  for (const product of db.products) {
    keys.push(stockKey('gram', product.id))
    if (product.bottle) keys.push(stockKey('bottle', product.id))
  }
  for (const flakon of db.flakons) keys.push(stockKey('flakon', flakon.id))
  const listed = new Set(keys)
  for (const [key, balance] of Object.entries(db.stock) as [StockKey, StockBalance][]) {
    if (!listed.has(key) && balance.qty !== 0 && ownerExists(db, key)) keys.push(key)
  }
  return keys
}

/** Sotuvdagi pozitsiyami: faol atirning razlivi, faol atirning original flakoni (sotilsa) va faol tara. */
export function isOnSale(db: Db, key: StockKey): boolean {
  const { kind, id } = parseStockKey(key)
  if (kind === 'flakon') return db.flakons.some((flakon) => flakon.id === id && flakon.active)
  const product = db.products.find((item) => item.id === id)
  return !!product && product.active && (kind === 'gram' || !!product.bottle)
}

/** Sotuvdagi pozitsiyalar — kam qolish ogohlantirishlari (admin paneli belgisi, dashboard) shular bo'yicha. */
export function activeStockKeys(db: Db): StockKey[] {
  return allStockKeys(db).filter((key) => isOnSale(db, key))
}

/** Kam qolgan (to'ldirish kerak) pozitsiyalar. */
export function lowStockKeys(db: Db): StockKey[] {
  return activeStockKeys(db).filter((key) => isLowStock(db, key))
}

/** Pozitsiya nomi (xodim tilida): "Dior Sauvage — razliv", "Dior Sauvage — original 100 ml", "Flakon 50 ml". */
export function stockItemName(db: Db, key: StockKey): string {
  const { kind, id } = parseStockKey(key)
  if (kind === 'flakon') return db.flakons.find((flakon) => flakon.id === id)?.name ?? id
  const product = db.products.find((item) => item.id === id)
  if (!product) return id
  if (kind === 'gram') return `${product.name} — ${tr('razliv', 'розлив')}`
  // original sotuvdan olingan bo'lsa hajmi noma'lum — "original" o'zi
  const original = tr('original', 'оригинал')
  return product.bottle ? `${product.name} — ${original} ${product.bottle.volumeMl} ${tr('ml', 'мл')}` : `${product.name} — ${original}`
}

/**
 * Kam qoldimi (to'ldirish kerakmi). Sotuvda bo'lmagan pozitsiya (nofaol atir yoki tara, original sotuvdan olingan
 * atirning flakoni) hech qachon "kam" emas — aks holda ular abadiy ogohlantirish bo'lib qoladi.
 */
export function isLowStock(db: Db, key: StockKey): boolean {
  if (!isOnSale(db, key)) return false
  const { qty } = balanceOf(db, key)
  return stockUnit(key) === 'g' ? qty < db.settings.lowStockGrams : qty < db.settings.lowStockPieces
}

/** Mijoz ilovasi uchun: razliv eng kam hajmda yoki original flakon kamida 1 dona bormi. */
export function isAvailable(db: Db, kind: 'gram' | 'bottle', productId: ID): boolean {
  const { qty } = balanceOf(db, stockKey(kind, productId))
  return kind === 'gram' ? qty >= db.settings.minGrams : qty >= 1
}
