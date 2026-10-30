import { Ban } from 'lucide-react'
import type { ReactNode } from 'react'
import { http } from '@/api/http'
import Modal from '@/components/ui/Modal'
import { tdClass, thClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL, SOURCE_LABEL } from '@/domain/labels'
import { orderCost, orderProfit, orderTotals } from '@/domain/orders'
import type { ID } from '@/domain/types'
import { formatDate, formatDateTime, formatMoney, formatOrderNumber, formatPhone } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'
import { formatQty, userName } from './helpers'
import StatusBadge from './StatusBadge'

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{label}</p>
      <div className="mt-0.5 text-sm text-neutral-900">{children}</div>
    </div>
  )
}

function SumRow({ label, value, strong = false, tone = '' }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-base font-bold text-neutral-900' : 'text-sm text-neutral-600'} ${tone}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/** Buyurtma tafsilotlari: mijoz, qatorlar (tara tekin/pullik), summalar, tannarx va foyda, holatlar tarixi; bekor qilish. */
export default function OrderDetailsModal({ orderId, onClose }: { orderId: ID; onClose: () => void }) {
  const db = useDb()
  const order = db.orders.find((item) => item.id === orderId)
  if (!order) return null
  const totals = orderTotals(order)
  const cost = orderCost(order)
  const profit = orderProfit(order)

  const cancel = async () => {
    const result = await AppSwal.fire({
      title: tr('Buyurtmani bekor qilish', 'Отмена заказа'),
      html:
        order.status === 'done'
          ? tr(
              `${formatOrderNumber(order.number)} allaqachon berilgan. Bekor qilinsa, atir va taralar omborga qaytariladi va savdodan chiqadi.`,
              `${formatOrderNumber(order.number)} уже выдан. При отмене ароматы и тара вернутся на склад, а заказ исключится из продаж.`,
            )
          : tr(`${formatOrderNumber(order.number)} bekor qilinsinmi?`, `Отменить ${formatOrderNumber(order.number)}?`) +
            (order.stockApplied ? tr(' Ombordan chiqarilgan tovar qaytariladi.', ' Списанный со склада товар вернётся.') : ''),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: tr('Bekor qilish', 'Отменить заказ'),
      cancelButtonText: tr('Ortga', 'Назад'),
    })
    if (!result.isConfirmed) return
    if ((await commit(() => http.patch(`/orders/${order.id}`, { status: 'cancelled' }))) === null) return
    showToast(tr('Buyurtma bekor qilindi', 'Заказ отменён'))
  }

  return (
    <Modal
      title={`${tr('Buyurtma', 'Заказ')} ${formatOrderNumber(order.number)}`}
      onClose={onClose}
      // 6 ustunli qatorlar jadvali (tara, tannarx bilan) lg (672px) ga sig'maydi
      size="xl"
      footer={
        <>
          {order.status !== 'cancelled' && (
            <button type="button" onClick={() => void cancel()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-sm font-semibold text-red-700!">
              <Ban size={16} />
              {tr('Bekor qilish', 'Отменить заказ')}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-primary ml-auto h-10 rounded px-6 text-sm font-semibold">
            {tr('Yopish', 'Закрыть')}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">{SOURCE_LABEL[order.source]}</span>
          <span className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
            {FULFILLMENT_LABEL[order.fulfillment]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Info label={tr('Sana', 'Дата')}>{formatDateTime(order.createdAt)}</Info>
          <Info label={tr('Mijoz', 'Клиент')}>{order.customerName || '—'}</Info>
          <Info label={tr('Telefon', 'Телефон')}>{order.customerPhone ? formatPhone(order.customerPhone) : '—'}</Info>
          {order.slot && (
            <Info label={tr('Kelish / yetkazish vaqti', 'Время визита / доставки')}>
              {formatDate(order.slot.date)}, {String(order.slot.hour).padStart(2, '0')}:00
            </Info>
          )}
          {order.address && <Info label={tr('Manzil', 'Адрес')}>{order.address}</Info>}
          <Info label={tr('Kassir', 'Кассир')}>{userName(db, order.cashierId)}</Info>
          <Info label={tr("To'lov", 'Оплата')}>{order.payment ? PAYMENT_LABEL[order.payment] : tr("To'lanmagan", 'Не оплачен')}</Info>
          {order.comment && <Info label={tr('Izoh', 'Комментарий')}>{order.comment}</Info>}
        </div>

        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className={thClass}>{tr('Atir', 'Аромат')}</th>
                <th className={`${thClass} text-right`}>{tr('Miqdor', 'Количество')}</th>
                <th className={`${thClass} text-right`}>{tr('Narx', 'Цена')}</th>
                <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                <th className={thClass}>{tr('Tara', 'Тара')}</th>
                <th className={`${thClass} text-right`}>{tr('Tannarx', 'Себестоимость')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {order.lines.map((line) => {
                const flakon = line.flakon ? db.flakons.find((item) => item.id === line.flakon?.flakonId) : undefined
                const lineCost = line.unitCost === undefined ? undefined : line.qty * line.unitCost + (line.flakon?.unitCost ?? 0)
                return (
                  <tr key={line.id}>
                    {/* nom va tara sig'masa qatorga o'tadi — tor ekranda ham tannarx ustuni yashirinib qolmasin */}
                    <td className={`${tdClass} min-w-40 whitespace-normal!`}>
                      <p className="font-medium text-neutral-900">{line.name}</p>
                      <p className="text-xs text-neutral-500">{line.kind === 'gram' ? tr('Razliv', 'Розлив') : tr('Original flakon', 'Оригинальный флакон')}</p>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatQty(line.qty, line.kind === 'gram' ? 'g' : 'dona')}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(line.unitPrice)}</td>
                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(line.qty * line.unitPrice)}</td>
                    <td className={`${tdClass} min-w-32 whitespace-normal!`}>
                      {line.flakon ? (
                        <span className="text-xs">
                          {flakon?.name ?? line.flakon.flakonId} ·{' '}
                          {line.flakon.paid ? <b className="text-neutral-900">{formatMoney(line.flakon.price)}</b> : <span className="text-emerald-700">{tr('tekin', 'бесплатно')}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">{line.kind === 'gram' ? tr('tanlanmagan', 'не выбрана') : '—'}</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right text-neutral-500 tabular-nums`}>{lineCost === undefined ? '—' : formatMoney(lineCost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 rounded border border-neutral-200 p-4">
            <SumRow label={tr('Atirlar', 'Ароматы')} value={formatMoney(totals.goods)} />
            <SumRow label={tr('Pullik taralar', 'Платная тара')} value={formatMoney(totals.flakons)} />
            <SumRow label={tr('Yetkazish', 'Доставка')} value={formatMoney(totals.delivery)} />
            <div className="my-2 border-t border-neutral-200" />
            <SumRow label={tr('Jami', 'Итого')} value={formatMoney(totals.total)} strong />
            {order.stockApplied && (
              <>
                <SumRow label={tr('Tannarx', 'Себестоимость')} value={formatMoney(cost)} />
                <SumRow label={tr('Yalpi foyda', 'Валовая прибыль')} value={formatMoney(profit)} tone={profit < 0 ? 'text-red-700!' : 'text-emerald-700!'} />
              </>
            )}
            {!order.stockApplied && order.status !== 'cancelled' && (
              <p className="pt-1 text-xs text-neutral-500">
                {tr('Tovar hali ombordan chiqarilmagan ("Tayyor" bosilganda chiqadi).', 'Товар ещё не списан со склада (списывается при нажатии «Готов»).')}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{tr('Holatlar tarixi', 'История статусов')}</p>
            <ol className="relative space-y-3 border-l border-neutral-200 pl-4">
              {order.history.map((event, index) => (
                <li key={index} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-700" />
                  <p className="text-sm font-semibold text-neutral-900">{ORDER_STATUS_LABEL[event.status]}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDateTime(event.at)} · {event.userId ? userName(db, event.userId) : order.source === 'bot' ? tr('Mijoz (bot)', 'Клиент (бот)') : '—'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Modal>
  )
}
