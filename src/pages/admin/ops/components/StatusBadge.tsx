import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/domain/labels'
import type { OrderStatus } from '@/domain/types'

/** Buyurtma holati belgisi — rang doim yozuv bilan birga. */
export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${ORDER_STATUS_TONE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
