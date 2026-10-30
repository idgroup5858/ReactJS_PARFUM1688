import { AlertTriangle, ArrowRight, ChartColumn, Table2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, CardHeader } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { tdClass, thClass } from '@/components/ui/styles'
import { useDb } from '@/data/db'
import { ORDER_STATUS_LABEL } from '@/domain/labels'
import { stockItemName } from '@/domain/stock'
import type { OrderStatus } from '@/domain/types'
import { formatMoney, formatNumber, formatOrderNumber, formatTime } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import BarList from './components/BarList'
import ColumnChart from './components/ColumnChart'
import { formatMoneyShort, formatQty, formatStockQty, ordersCount, orderTotal } from './components/helpers'
import { usePeriod } from './components/period'
import PeriodFilter from './components/PeriodFilter'
import StatTile from './components/StatTile'
import StatusBadge from './components/StatusBadge'
import { percentChange } from './components/viz'
import { dashboardStats } from './dashboardStats'

const share = (value: number, total: number) => (total > 0 ? `${formatNumber((value / total) * 100, 1)}%` : '0%')

function WidgetLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
      {children}
      <ArrowRight size={13} />
    </Link>
  )
}

/** Admin bosh sahifasi: davr bo'yicha savdo ko'rsatkichlari, grafiklar va hozirgi holat (navbat, ombor, qarz). */
export default function DashboardPage() {
  useDocumentTitle(tr('Dashboard', 'Дашборд'))
  const db = useDb()
  const [period, setPeriod] = usePeriod('30d')
  const [dailyView, setDailyView] = useState<'chart' | 'table'>('chart')
  const stats = useMemo(() => dashboardStats(db, period), [db, period])
  const { current, previous } = stats
  const delta = (key: 'revenue' | 'count' | 'avg' | 'profit' | 'expenses' | 'losses' | 'net') =>
    previous ? percentChange(current[key], previous[key]) : null

  const statusCounts = (['new', 'accepted', 'preparing', 'ready'] as OrderStatus[]).map((status) => ({
    status,
    count: stats.active.filter((order) => order.status === status).length,
  }))
  const sourceTotal = stats.bySource.reduce((sum, group) => sum + group.revenue, 0)
  const paymentTotal = stats.byPayment.reduce((sum, group) => sum + group.revenue, 0)

  return (
    <div className="space-y-5">
      <PageHeader title={tr('Dashboard', 'Дашборд')} description={tr('Savdo, foyda va ombor holati', 'Продажи, прибыль и состояние склада')} />
      <PeriodFilter value={period} onChange={setPeriod} />

      {/* 4 ustun: savdo → foyda qatori, keyin chiqim · zarar · sof foyda (keng); telefonda 2 ustun */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={tr('Savdo', 'Продажи')}
          value={formatMoneyShort(current.revenue)}
          fullValue={formatMoney(current.revenue)}
          delta={delta('revenue')}
          hint={tr('yetkazish bilan', 'с доставкой')}
        />
        <StatTile
          label={tr('Buyurtmalar', 'Заказы')}
          value={formatNumber(current.count)}
          delta={delta('count')}
          hint={current.cancelled > 0 ? tr(`${current.cancelled} ta bekor`, `отменено: ${current.cancelled}`) : undefined}
        />
        <StatTile label={tr("O'rtacha chek", 'Средний чек')} value={formatMoneyShort(current.avg)} fullValue={formatMoney(current.avg)} delta={delta('avg')} />
        <StatTile
          label={tr('Yalpi foyda', 'Валовая прибыль')}
          value={formatMoneyShort(current.profit)}
          fullValue={formatMoney(current.profit)}
          delta={delta('profit')}
          hint={tr('sotuv − tannarx', 'продажи − себестоимость')}
        />
        <StatTile
          label={tr('Chiqimlar', 'Расходы')}
          value={formatMoneyShort(current.expenses)}
          fullValue={formatMoney(current.expenses)}
          delta={delta('expenses')}
          upIsGood={false}
        />
        <StatTile
          label={tr('Spisanie va kamomad', 'Списания и недостача')}
          value={formatMoneyShort(current.losses)}
          fullValue={formatMoney(current.losses)}
          delta={delta('losses')}
          upIsGood={false}
          hint={tr('tannarxda', 'по себестоимости')}
        />
        <div className="col-span-2 grid min-w-0">
          <StatTile
            label={tr('Sof foyda', 'Чистая прибыль')}
            value={formatMoneyShort(current.net)}
            fullValue={formatMoney(current.net)}
            delta={delta('net')}
            negative={current.net < 0}
            hint={tr('yalpi foyda − chiqim − spisanie', 'валовая прибыль − расходы − списания')}
          />
        </div>
      </div>

      {/* min-w-0: ustun ichidagi grafik / jadval keng bo'lsa ham telefonda sahifa yon tomonga chiqmasin */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title={stats.buckets.length > 0 && stats.buckets[0].axisLabel.includes(':') ? tr('Soatlik savdo', 'Продажи по часам') : tr('Savdo dinamikasi', 'Динамика продаж')}
              hint={tr('Berilgan buyurtmalar summasi', 'Сумма выданных заказов')}
              actions={
                <SegmentedControl
                  label={tr("Ko'rinish", 'Вид')}
                  value={dailyView}
                  onChange={setDailyView}
                  options={[
                    { value: 'chart', label: <ChartColumn size={14} />, title: tr('Grafik', 'График') },
                    { value: 'table', label: <Table2 size={14} />, title: tr('Jadval', 'Таблица') },
                  ]}
                />
              }
            />
            {dailyView === 'chart' ? (
              <ColumnChart
                columns={stats.buckets.map((bucket) => ({
                  key: bucket.key,
                  axisLabel: bucket.axisLabel,
                  label: bucket.label,
                  value: bucket.revenue,
                  valueLabel: formatMoney(bucket.revenue),
                  sub: ordersCount(bucket.count),
                }))}
              />
            ) : (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-neutral-200 bg-white">
                    <tr>
                      <th className={thClass}>{tr('Davr', 'Период')}</th>
                      <th className={`${thClass} text-right`}>{tr('Buyurtmalar', 'Заказы')}</th>
                      <th className={`${thClass} text-right`}>{tr('Savdo', 'Продажи')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {stats.buckets.map((bucket) => (
                      <tr key={bucket.key}>
                        <td className={tdClass}>{bucket.label}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(bucket.count)}</td>
                        <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(bucket.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={tr('Top 10 atirlar', 'Топ-10 ароматов')} hint={tr('Atir savdosi (taralar va yetkazishsiz)', 'Продажи ароматов (без тары и доставки)')} />
            <BarList
              rows={stats.topProducts.map((product, index) => ({
                id: product.id,
                label: (
                  <>
                    <span className="mr-2 text-xs text-neutral-400 tabular-nums">{index + 1}.</span>
                    {product.label}
                  </>
                ),
                value: product.revenue,
                valueLabel: formatMoney(product.revenue),
                sub: [product.grams > 0 && formatQty(product.grams, 'g'), product.bottles > 0 &&
                    tr(
                      `${product.bottles} ta original flakon`,
                      `${product.bottles} ${ruPlural(product.bottles, 'оригинальный флакон', 'оригинальных флакона', 'оригинальных флаконов')}`,
                    ),
                ]
                  .filter(Boolean)
                  .join(' · '),
              }))}
              empty={tr("Bu davrda savdo yo'q", 'За этот период продаж нет')}
            />
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader
                title={tr('Aromat oilalari', 'Семейства ароматов')}
                hint={tr("Atir bir nechta oilaga kirsa, har biriga qo'shiladi", 'Если аромат входит в несколько семейств, он учитывается в каждом')}
              />
              <BarList
                rows={stats.byFamily.map((group) => ({ id: group.id, label: group.label, value: group.revenue, valueLabel: formatMoney(group.revenue) }))}
              />
            </Card>
            <Card>
              <CardHeader title={tr('Kassirlar kesimida', 'По кассирам')} />
              <BarList
                rows={stats.byCashier.map((group) => ({
                  id: group.id,
                  label: group.label,
                  value: group.revenue,
                  valueLabel: formatMoney(group.revenue),
                  sub: ordersCount(group.count),
                }))}
              />
            </Card>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title={tr('Hozirgi buyurtmalar', 'Текущие заказы')} actions={<WidgetLink to="/admin/orders">{tr('Hammasi', 'Все')}</WidgetLink>} />
            {/* 2 × 2: "Tayyorlanmoqda" tor ustunda so'z o'rtasidan bo'linmasin */}
            <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100">
              {statusCounts.map(({ status, count }) => (
                <div key={status} className="flex min-w-0 items-baseline gap-2 bg-white px-4 py-2.5">
                  <span className="text-xl font-semibold text-neutral-900">{count}</span>
                  <span className="min-w-0 text-xs text-neutral-500">{ORDER_STATUS_LABEL[status]}</span>
                </div>
              ))}
            </div>
            {stats.active.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">{tr("Faol buyurtma yo'q", 'Активных заказов нет')}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.active.slice(0, 5).map((order) => (
                  <li key={order.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatOrderNumber(order.number)} <span className="font-normal text-neutral-500">· {formatTime(order.createdAt)}</span>
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {order.customerName} · {formatMoney(orderTotal(order))}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={tr('Savdo kanallari', 'Каналы продаж')} />
            <BarList
              rows={stats.bySource.map((group) => ({
                id: group.id,
                label: group.label,
                value: group.revenue,
                valueLabel: formatMoney(group.revenue),
                sub: `${share(group.revenue, sourceTotal)} · ${ordersCount(group.count)}`,
              }))}
            />
          </Card>

          <Card>
            <CardHeader title={tr("To'lov turlari", 'Способы оплаты')} />
            <BarList
              rows={stats.byPayment.map((group) => ({
                id: group.id,
                label: group.label,
                value: group.revenue,
                valueLabel: formatMoney(group.revenue),
                sub: `${share(group.revenue, paymentTotal)} · ${tr(`${group.count} ta`, `${group.count} ${ruPlural(group.count, 'оплата', 'оплаты', 'оплат')}`)}`,
              }))}
            />
          </Card>

          <Card>
            <CardHeader
              title={tr('Kam qolganlar', 'Заканчивается')}
              hint={tr('Ombordagi hozirgi qoldiq', 'Текущий остаток на складе')}
              actions={<WidgetLink to="/admin/stock">{tr('Ombor', 'Склад')}</WidgetLink>}
            />
            {stats.lowStock.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">{tr('Hammasi yetarli', 'Всего достаточно')}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.lowStock.slice(0, 6).map((item) => (
                  <li key={item.key} className="flex items-start gap-2 px-4 py-2.5 text-sm">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
                    {/* nom to'liq ko'rinsin (oxiridagi "— original 50 ml" / "— razliv" muhim) — sig'masa ikki qatorga */}
                    <span className="min-w-0 flex-1 break-words text-neutral-800">{stockItemName(db, item.key)}</span>
                    <span className={`shrink-0 font-semibold tabular-nums ${item.qty < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
                      {formatStockQty(item.key, item.qty)}
                    </span>
                  </li>
                ))}
                {stats.lowStock.length > 6 && (
                  <li className="px-4 py-2 text-xs text-neutral-500">
                    {tr(
                      `yana ${stats.lowStock.length - 6} ta pozitsiya`,
                      `ещё ${stats.lowStock.length - 6} ${ruPlural(stats.lowStock.length - 6, 'позиция', 'позиции', 'позиций')}`,
                    )}
                  </li>
                )}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title={tr('Yetkazib beruvchilarga qarz', 'Долг поставщикам')}
              actions={<WidgetLink to="/admin/suppliers">{tr('Batafsil', 'Подробнее')}</WidgetLink>}
            />
            <div className="px-4 pt-3 pb-1">
              <p className={`text-2xl font-semibold ${stats.totalDebt > 0 ? 'text-red-700' : 'text-neutral-900'}`}>{formatMoney(stats.totalDebt)}</p>
            </div>
            <ul className="space-y-1.5 px-4 pt-1 pb-4 text-sm">
              {stats.debts.slice(0, 3).map((item) => (
                <li key={item.supplierId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-neutral-600">{item.name}</span>
                  <span className="shrink-0 font-semibold text-neutral-900 tabular-nums">{formatMoney(item.debt)}</span>
                </li>
              ))}
              {stats.debts.length === 0 && <li className="text-neutral-400">{tr("Qarz yo'q", 'Долгов нет')}</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
