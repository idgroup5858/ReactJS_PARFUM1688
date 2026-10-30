import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/domain/labels'
import type { OrderStatus } from '@/domain/types'

/** Buyurtma holati belgisi (rangli ramka). */
export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${ORDER_STATUS_TONE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
