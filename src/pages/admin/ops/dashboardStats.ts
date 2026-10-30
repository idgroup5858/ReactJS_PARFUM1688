import { ACTIVE_STATUSES, orderProfit, orderTotals } from '@/domain/orders'
import { allStockKeys, balanceOf, isLowStock, stockUnit } from '@/domain/stock'
import type { Db, ID, Order, OrderSource, PaymentType, StockKey } from '@/domain/types'
import { addDays, dateKeyOf } from '@/lib/dates'
import { loc, tr } from '@/staff/i18n'
import { inPeriod, previousPeriod, type Period } from './components/period'
import { statusAt, supplierStats } from './components/helpers'

/** Hafta kunlari (yakshanbadan) — xodim tilida. */
export function weekdayNames(): string[] {
  return tr(
    'Yakshanba,Dushanba,Seshanba,Chorshanba,Payshanba,Juma,Shanba',
    'Воскресенье,Понедельник,Вторник,Среда,Четверг,Пятница,Суббота',
  ).split(',')
}

/** Oylar nomi — xodim tilida. */
export function monthNames(): string[] {
  return tr(
    'Yanvar,Fevral,Mart,Aprel,May,Iyun,Iyul,Avgust,Sentabr,Oktabr,Noyabr,Dekabr',
    'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь',
  ).split(',')
}

export type Totals = {
  revenue: number
  count: number
  avg: number
  profit: number
  expenses: number
  /** spisanie + inventarizatsiya farqi (tannarxda; kamomad — musbat, ortiqcha — manfiy) */
  losses: number
  net: number
  cancelled: number
}

export type Bucket = { key: string; axisLabel: string; label: string; revenue: number; count: number }

export type Group = { id: string; label: string; revenue: number; count: number; extra?: number }

/** Sotuv: berilgan buyurtma va u berilgan vaqt — hamma hisob shu vaqt bo'yicha (kassadagi kunlik savdo bilan bir xil). */
type Sale = { order: Order; at: string }

function salesOf(db: Db, period: Period): Sale[] {
  return db.orders.flatMap((order) => {
    if (order.status !== 'done') return []
    const at = statusAt(order, 'done')
    return inPeriod(period, at) ? [{ order, at }] : []
  })
}

/** Davrdagi zarar tannarxda: spisanie hujjatlari + inventarizatsiyada chiqqan farq (tizimdagi − sanalgan). */
function lossesOf(db: Db, period: Period): number {
  const writeOffs = db.writeOffs
    .filter((writeOff) => inPeriod(period, writeOff.date))
    .reduce((sum, writeOff) => sum + writeOff.lines.reduce((lineSum, line) => lineSum + line.qty * line.unitCost, 0), 0)
  const inventory = db.inventories
    .filter((count) => inPeriod(period, count.date))
    .reduce((sum, count) => sum + count.lines.reduce((lineSum, line) => lineSum + (line.expected - line.actual) * line.unitCost, 0), 0)
  return writeOffs + inventory
}

function totalsOf(db: Db, period: Period): Totals {
  const sales = salesOf(db, period)
  const revenue = sales.reduce((sum, { order }) => sum + orderTotals(order).total, 0)
  const profit = sales.reduce((sum, { order }) => sum + orderProfit(order), 0)
  const expenses = db.expenses.filter((expense) => inPeriod(period, expense.date)).reduce((sum, expense) => sum + expense.amount, 0)
  const losses = lossesOf(db, period)
  const cancelled = db.orders.filter((order) => order.status === 'cancelled' && inPeriod(period, statusAt(order, 'cancelled'))).length
  return {
    revenue,
    count: sales.length,
    avg: sales.length ? revenue / sales.length : 0,
    profit,
    expenses,
    losses,
    net: profit - expenses - losses,
    cancelled,
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Grafik bo'laklari: 1 kun — soatlar, 62 kungacha — kunlar, undan uzun — oylar. */
function bucketsOf(sales: Sale[], period: Period): Bucket[] {
  let from = period.from
  let to = period.to
  if (period.preset === 'all') {
    const keys = sales.map(({ at }) => dateKeyOf(at)).sort()
    from = keys[0] ?? to
    to = keys[keys.length - 1] ?? from
  }
  const buckets = new Map<string, Bucket>()

  if (from === to) {
    // ish kuni 09:00–23:00 atrofida, lekin bot buyurtmasi istalgan soatda berilishi mumkin — chetdagi soatlar ham kiradi
    const hours = sales.map(({ at }) => new Date(at).getHours())
    const first = Math.min(9, ...hours)
    const last = Math.max(22, ...hours)
    for (let hour = first; hour <= last; hour++) {
      buckets.set(String(hour), { key: String(hour), axisLabel: `${pad(hour)}:00`, label: `${pad(hour)}:00 – ${pad((hour + 1) % 24)}:00`, revenue: 0, count: 0 })
    }
    for (const { order, at } of sales) {
      const bucket = buckets.get(String(new Date(at).getHours()))
      if (bucket) {
        bucket.revenue += orderTotals(order).total
        bucket.count += 1
      }
    }
    return [...buckets.values()]
  }

  const MONTHS = monthNames()
  const WEEKDAYS = weekdayNames()
  const days: string[] = []
  for (let day = from; day <= to && days.length < 4000; day = addDays(day, 1)) days.push(day)
  const monthly = days.length > 62
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number)
    const key = monthly ? day.slice(0, 7) : day
    if (buckets.has(key)) continue
    buckets.set(
      key,
      monthly
        ? { key, axisLabel: `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`, label: `${MONTHS[m - 1]} ${y}`, revenue: 0, count: 0 }
        : { key, axisLabel: `${pad(d)}.${pad(m)}`, label: `${pad(d)}.${pad(m)}.${y}, ${WEEKDAYS[new Date(y, m - 1, d).getDay()].toLowerCase()}`, revenue: 0, count: 0 },
    )
  }
  for (const { order, at } of sales) {
    const day = dateKeyOf(at)
    const bucket = buckets.get(monthly ? day.slice(0, 7) : day)
    if (bucket) {
      bucket.revenue += orderTotals(order).total
      bucket.count += 1
    }
  }
  return [...buckets.values()]
}

function sorted(groups: Map<string, Group>): Group[] {
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue)
}

/** Dashboard uchun hamma hisob-kitob bitta joyda (sahifa faqat chizadi). */
export function dashboardStats(db: Db, period: Period) {
  const sales = salesOf(db, period)
  const current = totalsOf(db, period)
  const prevPeriod = previousPeriod(period)
  const previous = prevPeriod ? totalsOf(db, prevPeriod) : null

  const bySource = new Map<string, Group>()
  const byPayment = new Map<string, Group>()
  const byProduct = new Map<string, Group & { grams: number; bottles: number }>()
  const byFamily = new Map<string, Group>()
  const byCashier = new Map<string, Group>()
  const add = (map: Map<string, Group>, id: string, label: string, revenue: number) => {
    const group = map.get(id) ?? { id, label, revenue: 0, count: 0 }
    group.revenue += revenue
    group.count += 1
    map.set(id, group)
  }
  const sourceLabel: Record<OrderSource, string> = { bot: tr('Telegram bot', 'Telegram-бот'), pos: tr("Kassa (do'konda)", 'Касса (в магазине)') }
  const paymentLabel: Record<PaymentType, string> = { cash: tr('Naqd', 'Наличные'), card: tr('Karta', 'Карта'), click: 'Click', payme: 'Payme' }

  for (const { order } of sales) {
    const total = orderTotals(order).total
    add(bySource, order.source, sourceLabel[order.source], total)
    if (order.payment) add(byPayment, order.payment, paymentLabel[order.payment], total)
    const cashier = db.users.find((user) => user.id === order.cashierId)
    add(byCashier, order.cashierId ?? 'none', cashier?.name ?? tr('Biriktirilmagan', 'Не назначен'), total)
    for (const line of order.lines) {
      const revenue = line.qty * line.unitPrice
      const product = byProduct.get(line.productId) ?? { id: line.productId, label: line.name, revenue: 0, count: 0, grams: 0, bottles: 0 }
      product.revenue += revenue
      product.count += 1
      if (line.kind === 'gram') product.grams += line.qty
      else product.bottles += line.qty
      byProduct.set(line.productId, product)
      const families = db.products.find((item) => item.id === line.productId)?.categoryIds ?? []
      for (const categoryId of families) {
        const category = db.categories.find((item) => item.id === categoryId && item.group === 'family')
        if (category) add(byFamily, category.id, loc(category.name), revenue)
      }
    }
  }

  // hozirgi holat — davrdan qat'i nazar
  const active = db.orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const lowStock = allStockKeys(db)
    .filter((key) => isLowStock(db, key))
    .map((key: StockKey) => {
      const threshold = stockUnit(key) === 'g' ? db.settings.lowStockGrams : db.settings.lowStockPieces
      return { key, qty: balanceOf(db, key).qty, ratio: balanceOf(db, key).qty / Math.max(1, threshold) }
    })
    .sort((a, b) => a.ratio - b.ratio)
  const debts = [...supplierStats(db)]
    .map(([supplierId, stats]) => ({ supplierId: supplierId as ID, name: db.suppliers.find((item) => item.id === supplierId)?.name ?? supplierId, debt: stats.debt }))
    .filter((item) => item.debt > 0)
    .sort((a, b) => b.debt - a.debt)

  return {
    current,
    previous,
    buckets: bucketsOf(sales, period),
    bySource: sorted(bySource),
    byPayment: sorted(byPayment),
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    byFamily: sorted(byFamily),
    byCashier: sorted(byCashier),
    active,
    lowStock,
    debts,
    totalDebt: debts.reduce((sum, item) => sum + item.debt, 0),
  }
}
