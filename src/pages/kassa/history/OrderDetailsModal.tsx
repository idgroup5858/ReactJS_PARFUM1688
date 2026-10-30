import { Printer } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useDb } from '@/data/db'
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL, SOURCE_LABEL } from '@/domain/labels'
import { orderTotals } from '@/domain/orders'
import { formatDateTime, formatMoney, formatOrderNumber, formatPhone, formatTime } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'
import { tr } from '@/staff/i18n'
import StatusBadge from '../StatusBadge'
import { formatQty, lineSum, slotLabel } from '../kassaUtils'

/** Yopilgan buyurtma (berilgan / bekor qilingan) — faqat ko'rish va chekni qayta chiqarish. */
export default function OrderDetailsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const db = useDb()
  const order = db.orders.find((item) => item.id === orderId)
  if (!order) return null
  const totals = orderTotals(order)
  const userName = (id?: string) => db.users.find((user) => user.id === id)?.name

  const rows: [string, string][] = [
    [tr('Manba', 'Источник'), SOURCE_LABEL[order.source]],
    [tr('Vaqt', 'Время'), formatDateTime(order.createdAt)],
    [tr('Mijoz', 'Клиент'), [order.customerName, order.customerPhone && formatPhone(order.customerPhone)].filter(Boolean).join(' · ')],
    [tr('Kassir', 'Кассир'), userName(order.cashierId) ?? '—'],
    ...(order.source === 'bot' ? ([[tr('Turi', 'Тип'), FULFILLMENT_LABEL[order.fulfillment]]] as [string, string][]) : []),
    ...(order.slot ? ([[tr('Mijoz vaqti', 'Время клиента'), slotLabel(order.slot) ?? '']] as [string, string][]) : []),
    ...(order.address ? ([[tr('Manzil', 'Адрес'), order.address]] as [string, string][]) : []),
    [tr("To'lov", 'Оплата'), order.payment ? PAYMENT_LABEL[order.payment] : '—'],
  ]

  return (
    <Modal
      title={tr(`Buyurtma ${formatOrderNumber(order.number)}`, `Заказ ${formatOrderNumber(order.number)}`)}
      onClose={onClose}
      size="wide"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost h-11 flex-1 rounded text-sm font-semibold">
            {tr('Yopish', 'Закрыть')}
          </button>
          {order.status === 'done' && (
            <button type="button" onClick={() => printReceipt(order, db)} className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-semibold">
              <Printer size={18} /> {tr('Chekni chiqarish', 'Печать чека')}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          {order.comment && <span className="truncate pl-3 text-xs text-brand-800">{tr('Izoh', 'Комментарий')}: {order.comment}</span>}
        </div>
        <dl className="divide-y divide-neutral-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3 py-1.5">
              <dt className="w-28 shrink-0 text-neutral-500">{label}</dt>
              <dd className="min-w-0 flex-1 font-medium break-words text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>

        <ul className="divide-y divide-neutral-100 rounded border border-neutral-200">
          {order.lines.map((line) => {
            const flakon = line.flakon ? db.flakons.find((item) => item.id === line.flakon?.flakonId) : undefined
            return (
              <li key={line.id} className="px-3 py-2">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 font-semibold text-neutral-900">
                    {line.name}
                    {line.kind === 'bottle' && <span className="font-normal text-neutral-500"> · {tr('original', 'оригинал')}</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(lineSum(line))}</span>
                </div>
                <p className="text-xs text-neutral-500 tabular-nums">
                  {formatQty(line)} × {formatMoney(line.unitPrice)}
                  {flakon && ` · ${flakon.name} — ${line.flakon?.paid ? formatMoney(line.flakon.price) : tr('tekin', 'бесплатно')}`}
                </p>
              </li>
            )
          })}
        </ul>

        <div className="space-y-1 tabular-nums">
          {totals.flakons > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>{tr('Flakonlar', 'Флаконы')}</span>
              <span>{formatMoney(totals.flakons)}</span>
            </div>
          )}
          {totals.delivery > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>{tr('Yetkazish', 'Доставка')}</span>
              <span>{formatMoney(totals.delivery)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-neutral-900">
            <span>{tr('Jami', 'Итого')}</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <div>
          <p className="title-section mb-1.5 text-neutral-500">{tr('Tarix', 'История')}</p>
          <ol className="space-y-1">
            {order.history.map((event, index) => (
              <li key={index} className="flex gap-3 text-xs">
                <span className="w-12 shrink-0 text-neutral-400 tabular-nums">{formatTime(event.at)}</span>
                <span className="font-semibold text-neutral-700">{ORDER_STATUS_LABEL[event.status]}</span>
                <span className="truncate text-neutral-500">{userName(event.userId) ?? (event.status === 'new' ? tr('Mijoz (bot)', 'Клиент (бот)') : '')}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  )
}
