import { useMemo } from 'react'
import { useDb } from '@/data/db'
import { shortages } from '@/domain/orders'
import type { Db, OrderLine, Product } from '@/domain/types'
import { useCustomer, type CartLine } from './store'

export type ResolvedLine = CartLine & { product: Product; unitPrice: number; total: number }

/** Savat qatorlari joriy narx bilan (o'chirilgan yoki sotuvdan olingan atirlar tashlab ketiladi). */
export function resolveCart(db: Db, cart: CartLine[]): ResolvedLine[] {
  return cart.flatMap((line) => {
    const product = db.products.find((item) => item.id === line.productId && item.active)
    if (!product) return []
    if (line.kind === 'bottle' && !product.bottle) return []
    const unitPrice = line.kind === 'gram' ? product.pricePerGram : (product.bottle?.price ?? 0)
    return [{ ...line, product, unitPrice, total: unitPrice * line.qty }]
  })
}

/** Buyurtma qatorlari (narx shu paytdagisi bilan "muzlatiladi"). Flakonni kassir keyin tanlaydi. */
export function toOrderLines(lines: ResolvedLine[]): OrderLine[] {
  return lines.map((line, index) => ({
    id: `l-${index + 1}`,
    productId: line.productId,
    kind: line.kind,
    name: line.product.name,
    qty: line.qty,
    unitPrice: line.unitPrice,
  }))
}

export function useCart() {
  const db = useDb()
  const { cart } = useCustomer()
  return useMemo(() => {
    const lines = resolveCart(db, cart)
    const total = lines.reduce((sum, line) => sum + line.total, 0)
    const missing = shortages(db, toOrderLines(lines))
    return { lines, total, missing }
  }, [db, cart])
}
