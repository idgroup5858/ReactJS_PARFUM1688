import { inputClass, selectClass } from '@/components/ui/styles'
import { orderTotals } from '@/domain/orders'
import { parseStockKey, stockUnit } from '@/domain/stock'
import type { Db, ID, ImagePath, Order, StockKey, StockKind } from '@/domain/types'
import { formatCompact, formatDocNumber, formatMoney, formatNumber, formatOrderNumber, NBSP } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { bilingual, ruPlural, tr } from '@/staff/i18n'

export const PAGE_SIZE = 10

/**
 * Filtr qatoridagi ixcham maydonlar (36px, 36px li SegmentedControl / qidiruv bilan bir qatorda). Umumiy klassdagi
 * `h-10 w-full` ni oddiy `h-9 w-auto` bosib o'tolmaydi (Tailwind klass tartibi), shuning uchun `!` bilan.
 */
export const filterSelectClass = `${selectClass} h-9! w-auto! max-w-full`
/** Filtr to'rida (grid) — kengligi katak bo'yicha, balandligi ixcham. */
export const filterGridSelectClass = `${selectClass} h-9!`
export const filterDateClass = `${inputClass} h-9! w-auto!`

/**
 * Buyurtma shu holatga o'tgan vaqt (domain/orders.ts). Hisobotlarda savdo "Berildi" vaqti bo'yicha olinadi: bot
 * buyurtmasi oldindan (Ertaga / Indinga) berilsa ham pul kassaga tushgan kunga yoziladi — kassadagi "Bugungi savdo"
 * bilan bir xil.
 */
export { statusAt } from '@/domain/orders'

/** HTML ichiga matn qo'yish (SweetAlert `html` uchun) — nomlardagi `<`, `&` belgilar teg bo'lib ketmasin. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

/**
 * Uzun hujjat formasi (prixod, spisanie, inventarizatsiya) yopilishidan oldin: biror narsa kiritilgan bo'lsa so'raydi —
 * fonga adashib bosish yoki Esc yarim to'ldirilgan hujjatni o'chirib yubormasin. Ochiq dialog ustidagi takroriy Esc
 * e'tiborsiz qoladi.
 */
export async function confirmDiscard(dirty: boolean): Promise<boolean> {
  if (!dirty) return true
  if (AppSwal.isVisible()) return false
  const result = await AppSwal.fire({
    icon: 'warning',
    title: tr('Kiritilganlar saqlanmaydi', 'Введённые данные не сохранятся'),
    text: tr("Oyna yopilsa, kiritilgan ma'lumotlar o'chib ketadi. Yopilsinmi?", 'Если закрыть окно, введённые данные будут потеряны. Закрыть?'),
    showCancelButton: true,
    confirmButtonText: tr('Yopish', 'Закрыть'),
    cancelButtonText: tr('Davom etish', 'Продолжить'),
  })
  return result.isConfirmed
}

/** Ombor pozitsiyasi turi — qisqa yorliq. */
export const STOCK_KIND_SHORT = bilingual<StockKind>({
  gram: ['Razliv', 'Розлив'],
  bottle: ['Original', 'Оригинал'],
  flakon: ['Tara', 'Тара'],
})

/** "8 ta buyurtma" / "8 заказов" */
export function ordersCount(count: number): string {
  return tr(`${count} ta buyurtma`, `${count} ${ruPlural(count, 'заказ', 'заказа', 'заказов')}`)
}

export function userName(db: Db, id: ID | undefined): string {
  if (!id) return '—'
  return db.users.find((user) => user.id === id)?.name ?? '—'
}

/** Ombor birligi yozuvi xodim tilida: "g" / "г", "dona" / "шт." (maydon ichidagi qo'shimcha uchun ham). */
export function unitLabel(unit: 'g' | 'dona'): string {
  return unit === 'g' ? tr('g', 'г') : tr('dona', 'шт.')
}

/** "1 250 g" / "3 dona" */
export function formatQty(qty: number, unit: 'g' | 'dona'): string {
  return `${formatNumber(qty)}${NBSP}${unitLabel(unit)}`
}

export function formatStockQty(key: StockKey, qty: number): string {
  return formatQty(qty, stockUnit(key))
}

/** Pozitsiya rasmi: atir yoki flakon rasmi. */
export function stockImage(db: Db, key: StockKey): ImagePath | undefined {
  const { kind, id } = parseStockKey(key)
  if (kind === 'flakon') return db.flakons.find((flakon) => flakon.id === id)?.image
  return db.products.find((product) => product.id === id)?.image
}

/** Harakat hujjati: "#1023" (buyurtma), "PR-0003", "SPS-0001", "INV-0002". */
export function docLabel(db: Db, refId: ID | undefined): string | undefined {
  if (!refId) return undefined
  const order = db.orders.find((item) => item.id === refId)
  if (order) return formatOrderNumber(order.number)
  const purchase = db.purchases.find((item) => item.id === refId)
  if (purchase) return formatDocNumber('PR', purchase.number)
  const writeOff = db.writeOffs.find((item) => item.id === refId)
  if (writeOff) return formatDocNumber('SPS', writeOff.number)
  const inventory = db.inventories.find((item) => item.id === refId)
  if (inventory) return formatDocNumber('INV', inventory.number)
  return undefined
}

/**
 * Har bir prixod bo'yicha to'langan summa: avval shu prixodga bog'langan to'lovlar, keyin yetkazib beruvchiga umumiy
 * to'lovlar eng eski to'lanmagan prixoddan boshlab taqsimlanadi — prixodlardagi qarz yig'indisi yetkazib beruvchi
 * qarziga teng bo'ladi.
 */
export function purchasePaidMap(db: Db): Map<ID, number> {
  const paid = new Map<ID, number>()
  const free = new Map<ID, number>()
  for (const payment of db.supplierPayments) {
    if (payment.purchaseId && db.purchases.some((purchase) => purchase.id === payment.purchaseId)) {
      paid.set(payment.purchaseId, (paid.get(payment.purchaseId) ?? 0) + payment.amount)
    } else {
      free.set(payment.supplierId, (free.get(payment.supplierId) ?? 0) + payment.amount)
    }
  }
  const oldestFirst = [...db.purchases].sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)
  for (const purchase of oldestFirst) {
    let rest = free.get(purchase.supplierId) ?? 0
    const already = paid.get(purchase.id) ?? 0
    const take = Math.min(rest, Math.max(0, purchase.total - already))
    if (take > 0) {
      paid.set(purchase.id, already + take)
      rest -= take
      free.set(purchase.supplierId, rest)
    }
  }
  return paid
}

export type SupplierStats = { purchased: number; paid: number; debt: number; purchases: number }

/** Har bir yetkazib beruvchi: jami prixod, jami to'lov, qarz (prixod − to'lov). */
export function supplierStats(db: Db): Map<ID, SupplierStats> {
  const stats = new Map<ID, SupplierStats>()
  const get = (id: ID) => {
    let value = stats.get(id)
    if (!value) {
      value = { purchased: 0, paid: 0, debt: 0, purchases: 0 }
      stats.set(id, value)
    }
    return value
  }
  for (const purchase of db.purchases) {
    const value = get(purchase.supplierId)
    value.purchased += purchase.total
    value.purchases += 1
  }
  for (const payment of db.supplierPayments) get(payment.supplierId).paid += payment.amount
  for (const value of stats.values()) value.debt = value.purchased - value.paid
  return stats
}

/** Ko'rsatkich kartochkasi uchun: 1 000 000 dan katta summa qisqa ("188,7 mln so'm"), kichigi to'liq. */
export function formatMoneyShort(value: number): string {
  return Math.abs(value) >= 1_000_000 ? `${formatCompact(value)}${NBSP}${tr("so'm", 'сум')}` : formatMoney(value)
}

/** Buyurtma summasi (mijoz to'laydigan). */
export function orderTotal(order: Order): number {
  return orderTotals(order).total
}

/** Qidiruv: matnni kichik harfga, bo'shliqsiz telefon raqami bilan ham mos keladi. */
export function matches(query: string, ...values: (string | number | undefined)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return values.some((value) => {
    if (value === undefined) return false
    const text = String(value).toLowerCase()
    return text.includes(q) || (digits.length >= 3 && text.replace(/\D/g, '').includes(digits))
  })
}
