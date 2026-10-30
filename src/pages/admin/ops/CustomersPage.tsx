import { Eye, Send, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import type { Customer, Order } from '@/domain/types'
import { formatDate, formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatPhone } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import { matches, orderTotal } from './components/helpers'
import OrderDetailsModal from './components/OrderDetailsModal'
import StatusBadge from './components/StatusBadge'

type Row = Customer & { orders: Order[]; doneCount: number; spent: number; lastAt?: string }
type Sort = 'spent' | 'recent' | 'new'

/** Mijozlar bazasi — buyurtmalardan o'zi to'planadi (bot orqali yoki kassada telefon kiritilganda). */
export default function CustomersPage() {
  useDocumentTitle(tr('Mijozlar', 'Клиенты'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('spent')
  const [openId, setOpenId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const byCustomer = new Map<string, Order[]>()
    for (const order of db.orders) if (order.customerId) byCustomer.set(order.customerId, [...(byCustomer.get(order.customerId) ?? []), order])
    return db.customers
      .map((customer) => {
        const orders = (byCustomer.get(customer.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        const done = orders.filter((order) => order.status === 'done')
        return {
          ...customer,
          orders,
          doneCount: done.length,
          spent: done.reduce((sum, order) => sum + orderTotal(order), 0),
          lastAt: orders[0]?.createdAt,
        }
      })
      .filter((row) => matches(query, row.name, row.phone))
      .sort((a, b) =>
        sort === 'spent' ? b.spent - a.spent : sort === 'recent' ? (b.lastAt ?? '').localeCompare(a.lastAt ?? '') : b.createdAt.localeCompare(a.createdAt),
      )
  }, [db, query, sort])
  const { pageItems, pagination } = usePagination(rows, `${query}|${sort}`)
  const open = rows.find((row) => row.id === openId) ?? null

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Mijozlar', 'Клиенты')}
        description={tr(
          `${formatNumber(db.customers.length)} ta mijoz — buyurtmalardan avtomatik to'planadi`,
          `${formatNumber(db.customers.length)} ${ruPlural(db.customers.length, 'клиент', 'клиента', 'клиентов')} — собираются из заказов автоматически`,
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-sm">
          <SearchInput value={query} onChange={setQuery} placeholder={tr('Ism yoki telefon', 'Имя или телефон')} />
        </div>
        <SegmentedControl
          label={tr('Tartib', 'Сортировка')}
          value={sort}
          onChange={setSort}
          options={[
            { value: 'spent', label: tr("Ko'p xarid", 'По сумме покупок') },
            { value: 'recent', label: tr('Oxirgi faol', 'Недавно активные') },
            { value: 'new', label: tr('Yangi', 'Новые') },
          ]}
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title={tr('Mijoz topilmadi', 'Клиенты не найдены')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Mijoz', 'Клиент')}</th>
                    <th className={thClass}>{tr('Telefon', 'Телефон')}</th>
                    <th className={`${thClass} text-right`}>{tr('Buyurtmalar', 'Заказы')}</th>
                    <th className={`${thClass} text-right`}>{tr('Jami xarid', 'Всего покупок')}</th>
                    <th className={thClass}>{tr('Oxirgi buyurtma', 'Последний заказ')}</th>
                    <th className={thClass}>{tr("Qo'shilgan", 'Добавлен')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => (
                    <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                      <td className={tdClass}>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {row.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="max-w-48 truncate font-medium text-neutral-900">{row.name}</span>
                          {row.telegramId !== undefined && <Send size={13} className="shrink-0 text-sky-700" aria-label="Telegram" />}
                        </div>
                      </td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{row.phone ? formatPhone(row.phone) : '—'}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(row.doneCount)}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(row.spent)}</td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{row.lastAt ? formatDateTime(row.lastAt) : '—'}</td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(row.createdAt)}</td>
                      <td className={`${tdClass} w-10`} onClick={(event) => event.stopPropagation()}>
                        <IconButton label={tr("Ko'rish", 'Просмотр')} onClick={() => setOpenId(row.id)}>
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

      {/* ustida buyurtma oynasi ochiq bo'lsa, Esc faqat uni yopsin (ikkalasini emas) */}
      {open && <CustomerModal customer={open} onClose={() => setOpenId(null)} onOpenOrder={setOrderId} dismissable={!orderId} />}
      {orderId && <OrderDetailsModal orderId={orderId} onClose={() => setOrderId(null)} />}
    </div>
  )
}

/** Mijoz kartochkasi: telefon, ko'rsatkichlar va buyurtmalari (sahifalab — ro'yxat vaqt o'tishi bilan o'sadi). */
function CustomerModal({
  customer,
  onClose,
  onOpenOrder,
  dismissable,
}: {
  customer: Row
  onClose: () => void
  onOpenOrder: (id: string) => void
  dismissable: boolean
}) {
  const { pageItems, pagination } = usePagination(customer.orders, customer.id)
  return (
    <Modal title={customer.name} onClose={onClose} size="lg" dismissable={dismissable}>
      <div className="space-y-4">
        {/* telefon — alohida qatorda to'liq (kichik kartochkada qisqarib qolardi) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
          <span>
            {tr('Telefon', 'Телефон')}:{' '}
            {customer.phone ? (
              <a href={`tel:+${customer.phone}`} className="font-semibold text-neutral-900 tabular-nums hover:underline">
                {formatPhone(customer.phone)}
              </a>
            ) : (
              '—'
            )}
          </span>
          {customer.telegramId !== undefined && (
            <span className="inline-flex items-center gap-1 text-sky-700">
              <Send size={13} />
              Telegram
            </span>
          )}
          <span>
            {tr("Qo'shilgan", 'Добавлен')}: {formatDate(customer.createdAt)}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          {[
            [tr('Buyurtmalar', 'Заказы'), formatNumber(customer.doneCount)],
            [tr('Jami xarid', 'Всего покупок'), formatMoney(customer.spent)],
            [tr("O'rtacha chek", 'Средний чек'), formatMoney(customer.doneCount ? customer.spent / customer.doneCount : 0)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded border border-neutral-200 px-3 py-2">
              <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{label}</p>
              <p className="mt-0.5 text-sm font-semibold break-words text-neutral-900">{value}</p>
            </div>
          ))}
        </div>
        {customer.orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">{tr("Buyurtma yo'q", 'Заказов нет')}</p>
        ) : (
          <div className="rounded border border-neutral-200">
            <ul className="divide-y divide-neutral-100">
              {pageItems.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    <span className="w-14 shrink-0 font-semibold text-neutral-900 tabular-nums">{formatOrderNumber(order.number)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">
                      {formatDateTime(order.createdAt)} · {order.lines.map((line) => line.name).join(', ')}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(orderTotal(order))}</span>
                    <StatusBadge status={order.status} />
                  </button>
                </li>
              ))}
            </ul>
            <Pagination {...pagination} />
          </div>
        )}
      </div>
    </Modal>
  )
}
