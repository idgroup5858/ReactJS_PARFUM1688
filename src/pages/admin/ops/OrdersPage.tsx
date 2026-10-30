import { ClipboardList, Eye } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL, SOURCE_LABEL } from '@/domain/labels'
import type { Fulfillment, OrderSource, OrderStatus } from '@/domain/types'
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatPhone } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr } from '@/staff/i18n'
import { filterGridSelectClass, matches, orderTotal } from './components/helpers'
import OrderDetailsModal from './components/OrderDetailsModal'
import { inPeriod, usePeriod } from './components/period'
import PeriodFilter from './components/PeriodFilter'
import StatusBadge from './components/StatusBadge'

const STATUSES: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'done', 'cancelled']

/** Barcha buyurtmalar (bot va kassa): filtrlar, sahifalash, tafsilotlar va bekor qilish. */
export default function OrdersPage() {
  useDocumentTitle(tr('Buyurtmalar', 'Заказы'))
  const db = useDb()
  const [period, setPeriod] = usePeriod('30d')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [source, setSource] = useState<OrderSource | ''>('')
  const [fulfillment, setFulfillment] = useState<Fulfillment | ''>('')
  const [openId, setOpenId] = useState<string | null>(null)

  const orders = useMemo(
    () =>
      db.orders
        .filter(
          (order) =>
            inPeriod(period, order.createdAt) &&
            (!status || order.status === status) &&
            (!source || order.source === source) &&
            (!fulfillment || order.fulfillment === fulfillment) &&
            matches(query, formatOrderNumber(order.number), order.number, order.customerName, order.customerPhone),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db, period, query, status, source, fulfillment],
  )
  const doneSum = orders.filter((order) => order.status === 'done').reduce((sum, order) => sum + orderTotal(order), 0)
  const { pageItems, pagination } = usePagination(orders, `${period.from}|${period.to}|${query}|${status}|${source}|${fulfillment}`)

  return (
    <div className="space-y-5">
      <PageHeader title={tr('Buyurtmalar', 'Заказы')} description={tr('Telegram bot va kassadagi barcha buyurtmalar', 'Все заказы из Telegram-бота и кассы')} />

      <PeriodFilter value={period} onChange={setPeriod} allowAll />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={query} onChange={setQuery} placeholder={tr('Raqam, mijoz yoki telefon', 'Номер, клиент или телефон')} />
        <select aria-label={tr('Holat', 'Статус')} value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | '')} className={filterGridSelectClass}>
          <option value="">{tr('Barcha holatlar', 'Все статусы')}</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {ORDER_STATUS_LABEL[item]}
            </option>
          ))}
        </select>
        <select aria-label={tr('Manba', 'Источник')} value={source} onChange={(event) => setSource(event.target.value as OrderSource | '')} className={filterGridSelectClass}>
          <option value="">{tr('Bot va kassa', 'Бот и касса')}</option>
          <option value="bot">{SOURCE_LABEL.bot}</option>
          <option value="pos">{SOURCE_LABEL.pos}</option>
        </select>
        <select
          aria-label={tr('Olish turi', 'Способ получения')}
          value={fulfillment}
          onChange={(event) => setFulfillment(event.target.value as Fulfillment | '')}
          className={filterGridSelectClass}
        >
          <option value="">{tr('Olib ketish va yetkazish', 'Самовывоз и доставка')}</option>
          <option value="pickup">{FULFILLMENT_LABEL.pickup}</option>
          <option value="delivery">{FULFILLMENT_LABEL.delivery}</option>
        </select>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3 text-sm">
          <span className="text-neutral-500">
            {tr('Topildi', 'Найдено')}: <b className="text-neutral-900">{formatNumber(orders.length)}</b>
          </span>
          <span className="text-neutral-500">
            {tr('Berilganlar summasi', 'Сумма выданных')}: <b className="text-neutral-900">{formatMoney(doneSum)}</b>
          </span>
        </div>
        {orders.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ClipboardList}
              title={tr('Buyurtma topilmadi', 'Заказы не найдены')}
              message={tr("Filtrlarni o'zgartirib ko'ring", 'Попробуйте изменить фильтры')}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Raqam', 'Номер')}</th>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={thClass}>{tr('Mijoz', 'Клиент')}</th>
                    <th className={thClass}>{tr('Manba', 'Источник')}</th>
                    <th className={thClass}>{tr('Olish', 'Получение')}</th>
                    <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                    <th className={thClass}>{tr("To'lov", 'Оплата')}</th>
                    <th className={thClass}>{tr('Holat', 'Статус')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((order) => (
                    <tr key={order.id} onClick={() => setOpenId(order.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                      <td className={`${tdClass} font-semibold text-neutral-900 tabular-nums`}>{formatOrderNumber(order.number)}</td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDateTime(order.createdAt)}</td>
                      <td className={tdClass}>
                        <p className="max-w-48 truncate text-neutral-900">{order.customerName || '—'}</p>
                        {order.customerPhone && <p className="text-xs text-neutral-500">{formatPhone(order.customerPhone)}</p>}
                      </td>
                      <td className={`${tdClass} text-neutral-600`}>{SOURCE_LABEL[order.source]}</td>
                      <td className={`${tdClass} text-neutral-600`}>{FULFILLMENT_LABEL[order.fulfillment]}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(orderTotal(order))}</td>
                      <td className={`${tdClass} text-neutral-600`}>{order.payment ? PAYMENT_LABEL[order.payment] : '—'}</td>
                      <td className={tdClass}>
                        <StatusBadge status={order.status} />
                      </td>
                      <td className={`${tdClass} w-10`} onClick={(event) => event.stopPropagation()}>
                        <IconButton label={tr("Ko'rish", 'Просмотр')} onClick={() => setOpenId(order.id)}>
                          <Eye size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </>
        )}
      </Card>

      {openId && <OrderDetailsModal orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
