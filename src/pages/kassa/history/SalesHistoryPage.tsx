import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import { PAYMENT_LABEL, PAYMENT_TYPES, SOURCE_LABEL } from '@/domain/labels'
import { orderTotals } from '@/domain/orders'
import type { OrderSource, PaymentType } from '@/domain/types'
import { addDays, dateKeyOf, todayKey } from '@/lib/dates'
import { formatDate, formatMoney, formatNumber, formatOrderNumber, formatTime } from '@/lib/format'
import { tr } from '@/staff/i18n'
import StatusBadge from '../StatusBadge'
import { closedAt } from '../kassaUtils'
import OrderDetailsModal from './OrderDetailsModal'

type SourceFilter = 'all' | OrderSource
type StatusFilter = 'all' | 'done' | 'cancelled'

function Tile({ label, value, hint, accent = false }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded border border-neutral-200 bg-white px-4 py-3">
      <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-brand-700' : 'text-neutral-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500 tabular-nums">{hint}</p>}
    </div>
  )
}

/** Kunlik savdo: berilgan va bekor qilingan buyurtmalar (bot + kassa), to'lov turlari va manba bo'yicha jamlanma. */
export default function SalesHistoryPage() {
  const db = useDb()
  const [date, setDate] = useState(todayKey)
  const [source, setSource] = useState<SourceFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const dayOrders = useMemo(
    () =>
      db.orders
        .filter((order) => (order.status === 'done' || order.status === 'cancelled') && dateKeyOf(closedAt(order)) === date)
        .sort((a, b) => closedAt(b).localeCompare(closedAt(a))),
    [db, date],
  )

  const summary = useMemo(() => {
    const done = dayOrders.filter((order) => order.status === 'done')
    const byPayment = Object.fromEntries(PAYMENT_TYPES.map((type) => [type, 0])) as Record<PaymentType, number>
    const bySource: Record<OrderSource, number> = { bot: 0, pos: 0 }
    let total = 0
    for (const order of done) {
      const sum = orderTotals(order).total
      total += sum
      if (order.payment) byPayment[order.payment] += sum
      bySource[order.source] += sum
    }
    return {
      total,
      count: done.length,
      average: done.length ? total / done.length : 0,
      cancelled: dayOrders.length - done.length,
      byPayment,
      bySource,
      botCount: done.filter((order) => order.source === 'bot').length,
    }
  }, [dayOrders])

  const list = useMemo(
    () => dayOrders.filter((order) => (source === 'all' || order.source === source) && (status === 'all' || order.status === status)),
    [dayOrders, source, status],
  )
  const { pageItems, pagination } = usePagination(list, `${date}|${source}|${status}`, 15)
  const isToday = date === todayKey()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="title-section mr-auto text-brand-800">{isToday ? tr('Bugungi savdo', 'Продажи за сегодня') : `${tr('Savdo', 'Продажи')} · ${formatDate(date)}`}</h1>
        {/* oldingi kun · sana · keyingi kun — bitta qatorda (inputClass dagi w-full o'rniga o'ralgan qutining eni) */}
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label={tr('Oldingi kun', 'Предыдущий день')} title={tr('Oldingi kun', 'Предыдущий день')} className="btn-icon flex h-10 w-10 items-center justify-center rounded">
            <ChevronLeft size={18} />
          </button>
          <div className="w-40 sm:w-44">
            <input type="date" value={date} max={todayKey()} onChange={(event) => event.target.value && setDate(event.target.value)} aria-label={tr('Sana', 'Дата')} className={`${inputClass} tabular-nums`} />
          </div>
          <button
            type="button"
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            aria-label={tr('Keyingi kun', 'Следующий день')}
            title={tr('Keyingi kun', 'Следующий день')}
            className="btn-icon flex h-10 w-10 items-center justify-center rounded"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {!isToday && (
          <button type="button" onClick={() => setDate(todayKey())} className="btn-ghost h-10 rounded px-4 text-sm font-semibold">
            {tr('Bugun', 'Сегодня')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label={tr('Jami savdo', 'Всего продаж')} value={formatMoney(summary.total)} accent />
        <Tile
          label={tr('Cheklar', 'Чеки')}
          value={formatNumber(summary.count)}
          hint={`${tr('Bot', 'Бот')}: ${summary.botCount} · ${tr('Kassa', 'Касса')}: ${summary.count - summary.botCount}`}
        />
        <Tile label={tr("O'rtacha chek", 'Средний чек')} value={formatMoney(summary.average)} />
        <Tile label={tr('Bekor qilingan', 'Отменено')} value={formatNumber(summary.cancelled)} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {PAYMENT_TYPES.map((type) => (
          <Tile key={type} label={PAYMENT_LABEL[type]} value={<span className="text-base">{formatMoney(summary.byPayment[type])}</span>} />
        ))}
        <Tile label={SOURCE_LABEL.bot} value={<span className="text-base">{formatMoney(summary.bySource.bot)}</span>} />
        <Tile label={SOURCE_LABEL.pos} value={<span className="text-base">{formatMoney(summary.bySource.pos)}</span>} />
      </div>

      <div className="rounded border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-3">
          <h2 className="title-section mr-auto text-brand-800">{tr('Buyurtmalar', 'Заказы')}</h2>
          <SegmentedControl
            label={tr('Manba', 'Источник')}
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: tr('Hammasi', 'Все') },
              { value: 'bot', label: tr('Bot', 'Бот') },
              { value: 'pos', label: tr('Kassa', 'Касса') },
            ]}
          />
          <SegmentedControl
            label={tr('Holat', 'Статус')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: tr('Hammasi', 'Все') },
              { value: 'done', label: tr('Berilgan', 'Выданные') },
              { value: 'cancelled', label: tr('Bekor', 'Отменённые') },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ReceiptText} title={tr("Bu kunda savdo yo'q", 'В этот день продаж нет')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Vaqt', 'Время')}</th>
                    <th className={thClass}>{tr('Raqam', 'Номер')}</th>
                    <th className={thClass}>{tr('Manba', 'Источник')}</th>
                    <th className={thClass}>{tr('Mijoz', 'Клиент')}</th>
                    <th className={thClass}>{tr('Tarkibi', 'Состав')}</th>
                    <th className={thClass}>{tr("To'lov", 'Оплата')}</th>
                    <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                    <th className={thClass}>{tr('Holat', 'Статус')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((order) => (
                    <tr key={order.id} onClick={() => setOpenId(order.id)} className="cursor-pointer hover:bg-neutral-50">
                      <td className={`${tdClass} text-neutral-500 tabular-nums`}>{formatTime(closedAt(order))}</td>
                      <td className={tdClass}>
                        {/* qator sichqoncha bilan ochiladi; raqam — klaviatura (Tab → Enter) uchun tugma */}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenId(order.id)
                          }}
                          aria-label={tr(`Buyurtma ${formatOrderNumber(order.number)} — batafsil`, `Заказ ${formatOrderNumber(order.number)} — подробнее`)}
                          className="cursor-pointer rounded font-semibold text-neutral-900 tabular-nums hover:text-brand-700 hover:underline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                        >
                          {formatOrderNumber(order.number)}
                        </button>
                      </td>
                      <td className={tdClass}>{SOURCE_LABEL[order.source]}</td>
                      <td className={`${tdClass} max-w-48 truncate`}>{order.customerName}</td>
                      <td className={`${tdClass} max-w-64 truncate text-neutral-600`}>{order.lines.map((line) => line.name).join(', ')}</td>
                      <td className={tdClass}>{order.payment ? PAYMENT_LABEL[order.payment] : '—'}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums ${order.status === 'cancelled' ? 'text-neutral-400 line-through' : ''}`}>
                        {formatMoney(orderTotals(order).total)}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </>
        )}
      </div>

      {openId && <OrderDetailsModal orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
