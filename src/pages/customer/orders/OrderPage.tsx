import { Check, CircleCheck, CircleX, PackageSearch } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import Img from '@/components/ui/Img'
import { usePageTitle } from '@/customer/chrome'
import EmptyBlock from '@/customer/components/EmptyBlock'
import StatusBadge from '@/customer/components/StatusBadge'
import { grams, money, useT, type Dict } from '@/customer/i18n'
import { useDb } from '@/data/db'
import { lineVolumeMl, orderTotals } from '@/domain/orders'
import type { Order, OrderStatus } from '@/domain/types'
import { addDays, todayKey } from '@/lib/dates'
import { formatDate, formatNumber, formatOrderNumber, formatTime, NBSP } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const STEPS: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'done']

function slotLabel(order: Order, t: Dict): string {
  if (!order.slot) return '—'
  const today = todayKey()
  const day =
    order.slot.date === today
      ? t.checkout.today
      : order.slot.date === addDays(today, 1)
        ? t.checkout.tomorrow
        : order.slot.date === addDays(today, 2)
          ? t.checkout.afterTomorrow
          : formatDate(order.slot.date)
  return `${day}, ${String(order.slot.hour).padStart(2, '0')}:00`
}

/**
 * Buyurtma holati: kassa holatni o'zgartirsa, server socket orqali xabar beradi va shu sahifa darhol yangilanadi.
 * Flakon kassir tanlagandan keyin ko'rinadi.
 */
export default function OrderPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const t = useT()
  const db = useDb()
  const order = db.orders.find((item) => item.id === id)
  const title = order ? t.order.title(formatOrderNumber(order.number)) : t.order.notFound
  usePageTitle(title)
  useDocumentTitle(title)

  if (!order) {
    return (
      <div className="p-4">
        <EmptyBlock icon={PackageSearch} title={t.order.notFound} />
      </div>
    )
  }

  const totals = orderTotals(order)
  const reached = (status: OrderStatus) => order.history.filter((event) => event.status === status).at(-1)
  const currentStep = STEPS.indexOf(order.status)
  const hint =
    order.status === 'ready' ? (order.fulfillment === 'delivery' ? t.order.readyDelivery : t.order.readyPickup) : t.order.statusHint[order.status]

  return (
    <div className="space-y-3 px-4 py-4">
      {params.get('placed') && order.status === 'new' && (
        <div className="flex gap-2.5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CircleCheck size={19} className="shrink-0" />
          <p className="font-medium">{t.order.placed}</p>
        </div>
      )}

      <section className="rounded border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">{formatOrderNumber(order.number)}</p>
            <p className="text-xs text-neutral-500">
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
          </div>
          <StatusBadge order={order} />
        </div>
        <p className="mt-3 text-sm text-neutral-700">{hint}</p>

        {order.status === 'cancelled' ? (
          <div className="mt-4 flex items-center gap-2 rounded bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            <CircleX size={18} />
            {t.order.status.cancelled}
          </div>
        ) : (
          <ol className="mt-4 space-y-0">
            {STEPS.map((step, index) => {
              const event = reached(step)
              const done = index <= currentStep
              const label = step === 'done' && order.fulfillment === 'delivery' ? t.order.delivered : t.order.status[step]
              return (
                <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < STEPS.length - 1 && (
                    <span className={`absolute top-6 bottom-0 left-[11px] w-0.5 ${index < currentStep ? 'bg-brand-fill' : 'bg-neutral-200'}`} />
                  )}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-brand-fill bg-brand-fill text-white' : 'border-neutral-300 bg-white'}`}
                  >
                    {done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 pt-0.5">
                    <span className={`text-sm ${index === currentStep ? 'font-bold text-neutral-900' : done ? 'text-neutral-800' : 'text-neutral-400'}`}>{label}</span>
                    {event && done && <span className="text-xs text-neutral-400 tabular-nums">{formatTime(event.at)}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="rounded border border-neutral-200 bg-white p-4">
        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-neutral-500">{t.order.when}</dt>
          <dd className="font-medium text-neutral-900">{slotLabel(order, t)}</dd>
          <dt className="text-neutral-500">{t.order.receive}</dt>
          <dd className="font-medium text-neutral-900">{order.fulfillment === 'delivery' ? t.checkout.delivery : t.checkout.pickup}</dd>
          {order.fulfillment === 'delivery' ? (
            <>
              <dt className="text-neutral-500">{t.order.address}</dt>
              <dd className="text-neutral-900">{order.address}</dd>
            </>
          ) : (
            <>
              <dt className="text-neutral-500">{t.checkout.shopAddress}</dt>
              <dd className="text-neutral-900">{db.settings.address}</dd>
            </>
          )}
          {order.comment && (
            <>
              <dt className="text-neutral-500">{t.order.comment}</dt>
              <dd className="text-neutral-900">{order.comment}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-[12px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.order.lines}</h2>
        <ul className="space-y-3">
          {order.lines.map((line) => {
            const product = db.products.find((item) => item.id === line.productId)
            const flakon = line.flakon ? db.flakons.find((item) => item.id === line.flakon?.flakonId) : undefined
            // buyurtma paytidagi hajm — admin keyin originalni o'chirsa ham ko'rinib turadi
            const ml = lineVolumeMl(db, line)
            return (
              <li key={line.id} className="flex gap-3">
                <Link to={`/product/${line.productId}`} className="bg-photo h-14 w-12 shrink-0 overflow-hidden rounded-sm">
                  <Img path={product?.image} alt={line.name} fit="contain" className="h-full w-full p-1" />
                </Link>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0 text-neutral-900">{line.name}</span>
                    <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{money(line.qty * line.unitPrice, t)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {line.kind === 'gram'
                      ? `${grams(line.qty, t)} × ${money(line.unitPrice, t)}`
                      : `${ml ? t.volume.originalOf(ml) : t.common.original} × ${line.qty}`}
                  </p>
                  {line.flakon && (
                    <p className="mt-0.5 flex justify-between gap-2 text-xs text-neutral-600">
                      {/* bazadagi flakon nomi bir tilli (o'zbekcha) — mijozga hajmi bilan, o'z tilida */}
                      <span>
                        {t.order.flakon}: {flakon ? `${formatNumber(flakon.volumeMl)}${NBSP}${t.common.ml}` : '—'}
                      </span>
                      <span className="whitespace-nowrap">{line.flakon.paid ? money(line.flakon.price, t) : t.order.free}</span>
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>{t.order.goods}</span>
            <span className="tabular-nums">{money(totals.goods, t)}</span>
          </div>
          {totals.flakons > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>{t.order.flakons}</span>
              <span className="tabular-nums">{money(totals.flakons, t)}</span>
            </div>
          )}
          {order.fulfillment === 'delivery' && (
            <div className="flex justify-between text-neutral-600">
              <span>{t.order.deliveryFee}</span>
              <span className="tabular-nums">{totals.delivery > 0 ? money(totals.delivery, t) : t.order.byAgreement}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-semibold text-neutral-800">{t.order.total}</span>
            <span className="text-xl font-bold text-brand-700 tabular-nums">{money(totals.total, t)}</span>
          </div>
          <p className="text-xs text-neutral-500">{order.payment ? `${t.order.paidBy}: ${t.payment[order.payment]}` : t.order.payOnReceive}</p>
        </div>
      </section>
    </div>
  )
}
