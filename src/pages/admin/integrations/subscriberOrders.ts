import { useMemo } from 'react'
import { useDb } from '@/data/db'
import { orderTotals } from '@/domain/orders'

export type SubscriberOrders = { count: number; total: number; customerName: string }

/**
 * Telegram id → mijozning buyurtmalari (Mini App orqali buyurtma bergan mijozda telegramId saqlanadi).
 * Bekor qilinganlar sanalmaydi.
 */
export function useOrdersByTelegramId(): Map<number, SubscriberOrders> {
  const db = useDb()
  return useMemo(() => {
    const byCustomer = new Map<string, { count: number; total: number }>()
    for (const order of db.orders) {
      if (!order.customerId || order.status === 'cancelled') continue
      const current = byCustomer.get(order.customerId) ?? { count: 0, total: 0 }
      current.count += 1
      current.total += orderTotals(order).total
      byCustomer.set(order.customerId, current)
    }
    const result = new Map<number, SubscriberOrders>()
    for (const customer of db.customers) {
      if (customer.telegramId === undefined) continue
      const orders = byCustomer.get(customer.id)
      if (orders) result.set(customer.telegramId, { ...orders, customerName: customer.name })
    }
    return result
  }, [db])
}
