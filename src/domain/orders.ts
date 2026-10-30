import { balanceOf, stockKey } from './stock'
import type { Db, Order, OrderLine, OrderStatus, StockKey } from './types'

/**
 * Buyurtma hisob-kitoblari (o'qish). Yaratish, holat va ombordan chiqarish — serverda (NestJS_PARFUM1688
 * `OrdersService`, `PATCH /api/orders/:id`).
 */

/** Buyurtma summalari. Yetkazish narxi foydaga kirmaydi (kuryerga ketadi). */
export function orderTotals(order: Pick<Order, 'lines' | 'deliveryFee'>) {
  const goods = order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
  const flakons = order.lines.reduce((sum, line) => sum + (line.flakon?.paid ? line.flakon.price : 0), 0)
  const delivery = order.deliveryFee
  return { goods, flakons, delivery, total: goods + flakons + delivery }
}

/** Tannarx: atir (grammi / donasi) + tara (tekin berilsa ham). Ombordan chiqarilmagan bo'lsa — 0. */
export function orderCost(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.qty * (line.unitCost ?? 0) + (line.flakon?.unitCost ?? 0), 0)
}

/** Yalpi foyda: sotuv (atir + pullik tara) − tannarx. */
export function orderProfit(order: Order): number {
  const { goods, flakons } = orderTotals(order)
  return goods + flakons - orderCost(order)
}

/**
 * Original qatorining flakon hajmi, ml: buyurtma paytida yozilgani ([OrderLine.volumeMl]), u bo'lmasa (eski
 * buyurtma) — atirning hozirgi originali. Noma'lum bo'lsa (original sotuvdan olingan) — `undefined`: chek va
 * ro'yxatlarda "original" o'zi yoziladi, bo'sh "original  ml" emas. Razliv qatorida — `undefined`.
 */
export function lineVolumeMl(db: Pick<Db, 'products'>, line: Pick<OrderLine, 'kind' | 'productId' | 'volumeMl'>): number | undefined {
  if (line.kind !== 'bottle') return undefined
  return line.volumeMl ?? db.products.find((product) => product.id === line.productId)?.bottle?.volumeMl
}

/**
 * Buyurtma shu holatga o'tgan vaqt: tarixdagi oxirgi shu holat hodisasi (bo'lmasa — yaratilgan vaqt).
 * Hisobotlarda savdo "Berildi" vaqti bo'yicha, bekor qilish — bekor qilingan vaqti bo'yicha olinadi (kassa va admin
 * uchun bitta ta'rif).
 */
export function statusAt(order: Order, status: OrderStatus): string {
  for (let i = order.history.length - 1; i >= 0; i--) if (order.history[i].status === status) return order.history[i].at
  return order.createdAt
}

/** Savdo hisobotlariga kiradigan buyurtmalar: berilgan (bekor qilingan va hali jarayondagilar emas). */
export function isCompleted(order: Order): boolean {
  return order.status === 'done'
}

/** Kassadagi navbat: new → accepted → preparing → ready → done. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'done',
}

export const ACTIVE_STATUSES: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready']

/** Omborda yetmaydigan pozitsiyalar (ogohlantirish uchun). */
export function shortages(db: Db, lines: OrderLine[]): { key: StockKey; need: number; have: number }[] {
  const need = new Map<StockKey, number>()
  for (const line of lines) {
    const key = stockKey(line.kind, line.productId)
    need.set(key, (need.get(key) ?? 0) + line.qty)
    if (line.flakon) {
      const flakonKey = stockKey('flakon', line.flakon.flakonId)
      need.set(flakonKey, (need.get(flakonKey) ?? 0) + 1)
    }
  }
  return [...need].flatMap(([key, qty]) => {
    const have = balanceOf(db, key).qty
    return have < qty ? [{ key, need: qty, have }] : []
  })
}
