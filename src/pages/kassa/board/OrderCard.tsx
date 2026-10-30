import { ArrowRight, Clock, MapPin, MessageSquareText, Phone, Store, Truck, X } from 'lucide-react'
import { orderTotals } from '@/domain/orders'
import type { Order } from '@/domain/types'
import { formatMoney, formatOrderNumber, formatPhone } from '@/lib/format'
import { bilingual, tr } from '@/staff/i18n'
import { formatQty, slotLabel, timeAgo } from '../kassaUtils'

const NEXT_LABEL: Partial<Record<Order['status'], string>> = bilingual<'new' | 'accepted' | 'preparing' | 'ready'>({
  new: ['Qabul qilish', 'Принять'],
  accepted: ['Tayyorlash', 'Готовить'],
  preparing: ['Tayyor…', 'Готов…'],
  ready: ['Berish…', 'Выдать…'],
})

type Props = {
  order: Order
  fresh: boolean
  now: number
  onOpen: () => void
  onAdvance: () => void
  onCancel: () => void
}

/**
 * Navbatdagi bot buyurtmasi kartochkasi. Bosilsa — tayyorlash oynasi; klaviaturada sarlavha (raqam) tugmasi orqali
 * ochiladi (pastki tugma esa holatni o'zgartiradi).
 */
export default function OrderCard({ order, fresh, now, onOpen, onAdvance, onCancel }: Props) {
  const { total } = orderTotals(order)
  const slot = slotLabel(order.slot)
  const shown = order.lines.slice(0, 3)

  return (
    <article
      onClick={onOpen}
      className={`cursor-pointer rounded border bg-white transition-colors hover:border-neutral-400 ${fresh ? 'border-brand-700 ring-2 ring-brand-200' : 'border-neutral-200'}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        aria-label={tr(`Buyurtma ${formatOrderNumber(order.number)} — batafsil`, `Заказ ${formatOrderNumber(order.number)} — подробнее`)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 text-left focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-brand-400"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-base font-bold text-neutral-900 tabular-nums">{formatOrderNumber(order.number)}</span>
          {fresh && <span className="rounded bg-brand-fill px-1.5 py-px text-[10px] font-bold tracking-wider text-white uppercase">{tr('Yangi', 'Новый')}</span>}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">{timeAgo(order.createdAt, now)}</span>
      </button>

      <div className="space-y-1.5 px-3 py-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-neutral-900">{order.customerName}</span>
          {order.customerPhone && (
            <a
              href={`tel:+${order.customerPhone}`}
              onClick={(event) => event.stopPropagation()}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <Phone size={12} />
              {formatPhone(order.customerPhone)}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-semibold ${order.fulfillment === 'delivery' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-neutral-200 bg-neutral-50 text-neutral-600'}`}
          >
            {order.fulfillment === 'delivery' ? <Truck size={12} /> : <Store size={12} />}
            {order.fulfillment === 'delivery' ? tr('Yetkazish', 'Доставка') : tr('Olib ketish', 'Самовывоз')}
          </span>
          {slot && (
            <span className="inline-flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 font-semibold text-neutral-700">
              <Clock size={12} />
              {slot}
            </span>
          )}
        </div>
        {order.address && (
          <p className="flex gap-1.5 text-xs text-neutral-600">
            <MapPin size={12} className="mt-0.5 shrink-0 text-neutral-400" />
            <span className="line-clamp-2">{order.address}</span>
          </p>
        )}
        {order.comment && (
          <p className="flex gap-1.5 text-xs text-brand-800">
            <MessageSquareText size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{order.comment}</span>
          </p>
        )}
        <ul className="space-y-0.5 border-t border-neutral-100 pt-1.5 text-xs text-neutral-700">
          {shown.map((line) => (
            <li key={line.id} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{line.name}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatQty(line)}
                {line.kind === 'bottle' ? tr(' · orig.', ' · ориг.') : ''}
              </span>
            </li>
          ))}
          {order.lines.length > shown.length && <li className="text-neutral-400">{tr(`+${order.lines.length - shown.length} ta yana`, `ещё +${order.lines.length - shown.length}`)}</li>}
        </ul>
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2">
        <span className="mr-auto text-sm font-bold text-neutral-900 tabular-nums">{formatMoney(total)}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCancel()
          }}
          aria-label={tr('Bekor qilish', 'Отменить')}
          title={tr('Bekor qilish', 'Отменить')}
          className="btn-icon-danger flex h-9 w-9 items-center justify-center rounded"
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAdvance()
          }}
          className="btn-primary flex h-9 items-center gap-1.5 rounded px-3 text-xs font-semibold"
        >
          {NEXT_LABEL[order.status]}
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  )
}
