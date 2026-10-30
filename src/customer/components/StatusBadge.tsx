import { ORDER_STATUS_TONE } from '@/domain/labels'
import type { Order } from '@/domain/types'
import { useT } from '../i18n'

/** Buyurtma holati belgisi mijoz tilida (yetkazilgan buyurtmada "Выдан" o'rniga "Доставлен"). */
export default function StatusBadge({ order }: { order: Pick<Order, 'status' | 'fulfillment'> }) {
  const t = useT()
  const label = order.status === 'done' && order.fulfillment === 'delivery' ? t.order.delivered : t.order.status[order.status]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${ORDER_STATUS_TONE[order.status]}`}>
      {label}
    </span>
  )
}
