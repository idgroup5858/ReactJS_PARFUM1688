import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { commit, useDb } from '@/data/db'
import { ORDER_STATUS_LABEL } from '@/domain/labels'
import { ACTIVE_STATUSES } from '@/domain/orders'
import type { Order, OrderStatus } from '@/domain/types'
import { formatOrderNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'
import { clearFresh, useFreshOrderIds } from '../newOrderAlerts'
import { slotDay, useNow } from '../kassaUtils'
import OrderCard from './OrderCard'
import OrderModal from './OrderModal'

type DayFilter = 'all' | 'today' | 'tomorrow' | 'later'

const dayOptions = (): { value: DayFilter; label: string }[] => [
  { value: 'all', label: tr('Hammasi', 'Все') },
  { value: 'today', label: tr('Bugun', 'Сегодня') },
  { value: 'tomorrow', label: tr('Ertaga', 'Завтра') },
  { value: 'later', label: tr('Indinga va keyin', 'Послезавтра и позже') },
]

const COLUMN_DOT: Record<string, string> = {
  new: 'bg-sky-500',
  accepted: 'bg-brand-700',
  preparing: 'bg-amber-500',
  ready: 'bg-emerald-500',
}

/** Kun bo'yicha tartib: avval vaqti yaqin (slot), keyin eskiroq berilgan. */
function sortKey(order: Order): string {
  const slot = order.slot ? `${order.slot.date} ${String(order.slot.hour).padStart(2, '0')}` : '9999'
  return `${slot} ${order.createdAt}`
}

/**
 * Bot buyurtmalari navbati: 4 ustun (Yangi → Qabul qilindi → Tayyorlanmoqda → Tayyor). Kassir mijoz kelguncha
 * tayyorlab qo'yadi; "Tayyor" va "Berish" tayyorlash oynasida (tara va to'lov turi tanlanadi).
 */
export default function OrdersBoardPage() {
  const db = useDb()
  const now = useNow()
  const fresh = useFreshOrderIds()
  const [search, setSearch] = useState('')
  const [day, setDay] = useState<DayFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const orders = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^#/, '')
    const digits = query.replace(/\D/g, '')
    return db.orders
      .filter((order) => order.source === 'bot' && ACTIVE_STATUSES.includes(order.status))
      .filter((order) => {
        if (day === 'all' || !order.slot) return day === 'all'
        const value = slotDay(order.slot.date)
        return day === 'today' ? value === 'today' || value === 'past' : value === day
      })
      .filter((order) => {
        if (!query) return true
        return (
          String(order.number).includes(digits || query) ||
          (digits.length >= 3 && order.customerPhone.includes(digits)) ||
          order.customerName.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  }, [db, search, day])

  const open = (order: Order) => {
    clearFresh(order.id)
    setOpenId(order.id)
  }

  const advance = async (order: Order) => {
    if (order.status === 'new' || order.status === 'accepted') {
      const next: OrderStatus = order.status === 'new' ? 'accepted' : 'preparing'
      clearFresh(order.id)
      if ((await commit(() => http.patch(`/orders/${order.id}`, { status: next }))) === null) return
      showToast(`${formatOrderNumber(order.number)} — ${ORDER_STATUS_LABEL[next]}`)
      return
    }
    // tara tanlash va to'lov turi — oynada
    open(order)
  }

  const cancel = async (order: Order) => {
    const result = await AppSwal.fire({
      icon: 'warning',
      title: tr('Bekor qilish', 'Отмена заказа'),
      text: order.stockApplied
        ? tr(
            `${formatOrderNumber(order.number)} bekor qilinsinmi? Ombordan chiqarilgan atir va tara qaytariladi.`,
            `Отменить заказ ${formatOrderNumber(order.number)}? Списанные со склада аромат и тара вернутся на склад.`,
          )
        : tr(`${formatOrderNumber(order.number)} bekor qilinsinmi?`, `Отменить заказ ${formatOrderNumber(order.number)}?`),
      showCancelButton: true,
      confirmButtonText: tr('Bekor qilish', 'Отменить заказ'),
      cancelButtonText: tr('Ortga', 'Назад'),
    })
    if (!result.isConfirmed) return
    clearFresh(order.id)
    if ((await commit(() => http.patch(`/orders/${order.id}`, { status: 'cancelled' }))) === null) return
    showToast(tr(`${formatOrderNumber(order.number)} bekor qilindi`, `${formatOrderNumber(order.number)} отменён`), 'info')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="title-section mr-auto text-brand-800">{tr('Buyurtmalar navbati', 'Очередь заказов')}</h1>
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder={tr('Raqam, telefon yoki ism', 'Номер, телефон или имя')} />
        </div>
        <SegmentedControl options={dayOptions()} value={day} onChange={setDay} label={tr('Kun', 'День')} />
      </div>

      <div className="grid min-h-0 flex-1 auto-cols-[minmax(270px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {ACTIVE_STATUSES.map((status) => {
          const column = orders.filter((order) => order.status === status)
          return (
            <section key={status} className="flex min-h-[320px] min-w-0 flex-col rounded border border-neutral-200 bg-neutral-100/60">
              <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2.5">
                <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                <h2 className="text-[11px] font-bold tracking-[0.14em] text-neutral-700 uppercase">{ORDER_STATUS_LABEL[status]}</h2>
                <span className="ml-auto rounded bg-neutral-100 px-1.5 py-px text-[11px] font-semibold text-neutral-500 tabular-nums">{column.length}</span>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {column.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-xs text-neutral-400">
                    <Inbox size={22} />
                    {tr("Bo'sh", 'Пусто')}
                  </div>
                ) : (
                  column.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      fresh={fresh.includes(order.id) && order.status === 'new'}
                      now={now}
                      onOpen={() => open(order)}
                      onAdvance={() => void advance(order)}
                      onCancel={() => void cancel(order)}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      {openId && <OrderModal key={openId} orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
