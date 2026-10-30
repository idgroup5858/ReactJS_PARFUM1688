import { CheckCheck, CircleX, ClipboardCheck, PackageCheck, Phone, Printer, TriangleAlert, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isApiError } from '@/api/errors'
import { http } from '@/api/http'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import { commit, getDb, useDb } from '@/data/db'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/domain/labels'
import { orderTotals, shortages } from '@/domain/orders'
import { balanceOf, stockItemName, stockKey } from '@/domain/stock'
import type { Flakon, OrderLine, OrderStatus, PaymentType } from '@/domain/types'
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatPhone } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'
import FlakonPicker, { type FlakonPick } from '../FlakonPicker'
import { clearFresh } from '../newOrderAlerts'
import PaymentPicker from '../PaymentPicker'
import StatusBadge from '../StatusBadge'
import { defaultFlakonId, formatQty, lineSum, slotLabel } from '../kassaUtils'

type Props = {
  orderId: string
  onClose: () => void
}

/** Razliv qatorlariga kassir tanlagan tara (tanlanmagan qator — tarasiz). */
function withPicks(lines: OrderLine[], picks: Record<string, FlakonPick>, flakons: Flakon[]): OrderLine[] {
  return lines.map((line) => {
    const pick = picks[line.id]
    const flakon = pick?.flakonId ? flakons.find((item) => item.id === pick.flakonId) : undefined
    if (line.kind !== 'gram' || !flakon) return { ...line, flakon: undefined }
    return { ...line, flakon: { flakonId: flakon.id, paid: pick.paid, price: flakon.price } }
  })
}

/** `PATCH /orders/:id` uchun: har razliv qatorining tarasi (`null` — tarasiz); narxni server o'zi qo'yadi. */
function flakonPayload(lines: OrderLine[], picks: Record<string, FlakonPick>) {
  return lines
    .filter((line) => line.kind === 'gram')
    .map((line) => ({ lineId: line.id, flakonId: picks[line.id]?.flakonId ?? null, paid: picks[line.id]?.paid ?? false }))
}

/** Yetkazish narxi yozilayotganda har harfda so'rov ketmasin — shuncha kutib saqlanadi. */
const FEE_SAVE_DELAY_MS = 600

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 flex-1 font-medium break-words text-neutral-900">{children}</span>
    </div>
  )
}

/**
 * Bot buyurtmasini tayyorlash oynasi: kassir har bir razliv qatoriga tara tanlaydi (tekin / pullik), yetkazish
 * narxini kiritadi (mijoz bilan telefonda kelishilgan), "Tayyor" — atir va tara ombordan chiqadi, "Berildi" —
 * to'lov turi bilan yopiladi.
 */
export default function OrderModal({ orderId, onClose }: Props) {
  const db = useDb()
  const order = db.orders.find((item) => item.id === orderId)

  const [picks, setPicks] = useState<Record<string, FlakonPick>>(() =>
    Object.fromEntries(
      (order?.lines ?? [])
        .filter((line) => line.kind === 'gram')
        .map((line) => [line.id, { flakonId: line.flakon?.flakonId ?? defaultFlakonId(getDb().flakons, line.qty), paid: line.flakon?.paid ?? false }]),
    ),
  )
  const [fee, setFee] = useState(order?.deliveryFee ?? 0)
  const [payment, setPayment] = useState<PaymentType | undefined>(order?.payment)
  const [busy, setBusy] = useState(false)
  const feeTimer = useRef<number | undefined>(undefined)
  const pendingFee = useRef<number | null>(null)

  useEffect(() => clearFresh(orderId), [orderId])

  /** Kutib turgan yetkazish narxini darhol yuboradi (oyna yopilganda ham kelishilgan narx yo'qolmasin). */
  const flushFee = useCallback(() => {
    window.clearTimeout(feeTimer.current)
    const value = pendingFee.current
    pendingFee.current = null
    if (value === null) return
    void commit(() => http.patch(`/orders/${orderId}`, { deliveryFee: value }), (error) => isApiError(error, 'order_finished'))
  }, [orderId])

  useEffect(() => flushFee, [flushFee])

  const locked = order?.stockApplied ?? true
  const draftLines: OrderLine[] = useMemo(() => {
    if (!order) return []
    if (order.stockApplied) return order.lines
    return withPicks(order.lines, picks, db.flakons)
  }, [order, picks, db.flakons])

  if (!order) return null

  const totals = orderTotals({ lines: draftLines, deliveryFee: fee })
  const short = locked ? [] : shortages(db, draftLines)
  const missingFlakon = !locked && order.lines.some((line) => line.kind === 'gram' && !picks[line.id]?.flakonId)
  const finished = order.status === 'done' || order.status === 'cancelled'

  /**
   * Tara, yetkazish narxi va to'lov turini saqlaydi; [status] berilsa — holatni ham (bitta so'rovda). Muvaffaqiyatli
   * bo'lsa `true`; xato — oyna chiqadi.
   */
  const save = async (status?: OrderStatus): Promise<boolean> => {
    window.clearTimeout(feeTimer.current)
    pendingFee.current = null
    setBusy(true)
    const result = await commit(() =>
      http.patch(`/orders/${order.id}`, {
        ...(!order.stockApplied && { flakons: flakonPayload(order.lines, picks) }),
        ...(order.fulfillment === 'delivery' && { deliveryFee: fee }),
        ...(payment && { payment }),
        ...(status && { status }),
      }),
    )
    setBusy(false)
    return result !== null
  }

  /**
   * Yetkazish narxi va tara kiritilishi bilan buyurtmaga yoziladi (holat o'zgarmaydi) — oyna ✕, Esc yoki fon bilan
   * yopilsa ham kelishilgan narx yo'qolmaydi, kartochka va mijoz sahifasidagi jami yangilanadi.
   */
  const changeFee = (value: number) => {
    setFee(value)
    pendingFee.current = value
    window.clearTimeout(feeTimer.current)
    feeTimer.current = window.setTimeout(flushFee, FEE_SAVE_DELAY_MS)
  }

  const changePick = (lineId: string, value: FlakonPick) => {
    const next = { ...picks, [lineId]: value }
    setPicks(next)
    if (order.stockApplied || finished) return
    void commit(() => http.patch(`/orders/${order.id}`, { flakons: flakonPayload(order.lines, next) }))
  }

  const markReady = async () => {
    if (missingFlakon) return
    if (short.length > 0) {
      const result = await AppSwal.fire({
        icon: 'warning',
        title: tr('Omborda yetmaydi', 'Не хватает на складе'),
        html: short
          .map((item) =>
            tr(
              `${stockItemName(db, item.key)}: kerak ${formatNumber(item.need)}, bor ${formatNumber(item.have)}`,
              `${stockItemName(db, item.key)}: нужно ${formatNumber(item.need)}, есть ${formatNumber(item.have)}`,
            ),
          )
          .join('<br>'),
        showCancelButton: true,
        confirmButtonText: tr('Baribir tayyor', 'Всё равно готов'),
      })
      if (!result.isConfirmed) return
    }
    if (!(await save('ready'))) return
    showToast(tr(`${formatOrderNumber(order.number)} tayyor`, `${formatOrderNumber(order.number)} готов`))
  }

  const markDone = async () => {
    if (!payment) return
    if (!(await save('done'))) return
    onClose()
    const result = await AppSwal.fire({
      icon: 'success',
      title: tr('Buyurtma berildi', 'Заказ выдан'),
      text: `${formatOrderNumber(order.number)} · ${formatMoney(totals.total)} · ${PAYMENT_LABEL[payment]}`,
      showCancelButton: true,
      confirmButtonText: tr('Chek chiqarish', 'Печать чека'),
      cancelButtonText: tr('Yopish', 'Закрыть'),
    })
    const saved = getDb().orders.find((item) => item.id === order.id)
    if (result.isConfirmed && saved) printReceipt(saved, getDb())
  }

  const cancel = async () => {
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
    if (!(await save('cancelled'))) return
    onClose()
    showToast(tr(`${formatOrderNumber(order.number)} bekor qilindi`, `${formatOrderNumber(order.number)} отменён`), 'info')
  }

  const print = () => printReceipt({ ...order, lines: draftLines, deliveryFee: fee, payment: payment ?? order.payment }, db)

  const primary: Record<OrderStatus, ReactNode> = {
    new: (
      <button
        type="button"
        onClick={() => void save('accepted')}
        disabled={busy}
        className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-semibold"
      >
        <ClipboardCheck size={18} /> {tr('Qabul qilish', 'Принять')}
      </button>
    ),
    accepted: (
      <button
        type="button"
        onClick={() => void save('preparing')}
        disabled={busy}
        className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-semibold"
      >
        <PackageCheck size={18} /> {tr('Tayyorlashni boshlash', 'Начать готовить')}
      </button>
    ),
    preparing: (
      <button
        type="button"
        onClick={() => void markReady()}
        disabled={missingFlakon || busy}
        title={missingFlakon ? tr('Har bir razliv uchun flakon tanlang', 'Выберите флакон для каждого розлива') : undefined}
        className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-semibold"
      >
        <CheckCheck size={18} /> {tr('Tayyor', 'Готов')}
      </button>
    ),
    ready: (
      <button
        type="button"
        onClick={() => void markDone()}
        disabled={!payment || busy}
        title={!payment ? tr("To'lov turini tanlang", 'Выберите способ оплаты') : undefined}
        className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-semibold"
      >
        <CheckCheck size={18} /> {tr('Berildi', 'Выдан')}
      </button>
    ),
    done: null,
    cancelled: null,
  }

  return (
    <Modal
      title={tr(`Buyurtma ${formatOrderNumber(order.number)}`, `Заказ ${formatOrderNumber(order.number)}`)}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap gap-2">
          {!finished && (
            <button type="button" onClick={() => void cancel()} className="btn-ghost flex h-11 items-center justify-center gap-2 rounded px-4 text-sm font-semibold text-red-700!">
              <CircleX size={18} /> {tr('Bekor qilish', 'Отменить')}
            </button>
          )}
          {(order.stockApplied || order.status === 'done') && (
            <button type="button" onClick={print} className="btn-outline flex h-11 items-center justify-center gap-2 rounded px-4 text-sm font-semibold">
              <Printer size={18} /> {tr('Chek', 'Чек')}
            </button>
          )}
          {primary[order.status]}
          {finished && (
            <button type="button" onClick={onClose} className="btn-ghost ml-auto flex h-11 items-center justify-center rounded px-5 text-sm font-semibold">
              {tr('Yopish', 'Закрыть')}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div className="divide-y divide-neutral-100">
            <InfoRow label={tr('Holat', 'Статус')}>
              <StatusBadge status={order.status} />
            </InfoRow>
            <InfoRow label={tr('Mijoz', 'Клиент')}>{order.customerName}</InfoRow>
            <InfoRow label={tr('Telefon', 'Телефон')}>
              {order.customerPhone ? (
                <a href={`tel:+${order.customerPhone}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                  <Phone size={14} />
                  {formatPhone(order.customerPhone)}
                </a>
              ) : (
                '—'
              )}
            </InfoRow>
          </div>
          <div className="divide-y divide-neutral-100">
            <InfoRow label={tr('Turi', 'Тип')}>
              <span className="inline-flex items-center gap-1.5">
                {order.fulfillment === 'delivery' && <Truck size={14} className="text-brand-700" />}
                {FULFILLMENT_LABEL[order.fulfillment]}
              </span>
            </InfoRow>
            <InfoRow label={tr('Vaqt', 'Время')}>{slotLabel(order.slot) ?? '—'}</InfoRow>
            <InfoRow label={tr('Berilgan', 'Оформлен')}>{formatDateTime(order.createdAt)}</InfoRow>
          </div>
        </div>
        {order.address && (
          <p className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
            <span className="text-neutral-500">{tr('Manzil', 'Адрес')}: </span>
            <span className="font-medium">{order.address}</span>
          </p>
        )}
        {order.comment && (
          <p className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
            <span className="font-semibold">{tr('Izoh', 'Комментарий')}: </span>
            {order.comment}
          </p>
        )}

        <div>
          <p className="title-section mb-2 text-neutral-500">{tr('Tarkibi', 'Состав')}</p>
          <div className="space-y-2">
            {draftLines.map((line) => {
              const have = balanceOf(db, stockKey(line.kind, line.productId)).qty
              const flakon = line.flakon ? db.flakons.find((item) => item.id === line.flakon?.flakonId) : undefined
              return (
                <div key={line.id} className="rounded border border-neutral-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">{line.name}</p>
                      <p className="text-xs text-neutral-500 tabular-nums">
                        {line.kind === 'bottle' ? tr('Original flakon · ', 'Оригинальный флакон · ') : tr('Razliv · ', 'Розлив · ')}
                        {formatQty(line)} × {formatMoney(line.unitPrice)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-neutral-900 tabular-nums">{formatMoney(lineSum(line))}</span>
                  </div>
                  {!locked && (
                    <p className={`mt-1 text-xs tabular-nums ${have < line.qty ? 'font-semibold text-red-700' : 'text-neutral-500'}`}>
                      {tr('Omborda', 'На складе')}: {formatNumber(have)} {line.kind === 'gram' ? tr('g', 'г') : tr('dona', 'шт.')}
                    </p>
                  )}
                  {line.kind === 'gram' && (
                    <div className="mt-2.5 border-t border-neutral-100 pt-2.5">
                      {locked ? (
                        <p className="text-sm text-neutral-600">
                          {flakon?.name ?? tr('Flakon', 'Флакон')} ·{' '}
                          <span className="font-semibold">{line.flakon?.paid ? formatMoney(line.flakon.price) : tr('Tekin', 'Бесплатно')}</span>
                        </p>
                      ) : order.status === 'preparing' || order.status === 'accepted' || order.status === 'new' ? (
                        <FlakonPicker
                          grams={line.qty}
                          value={picks[line.id] ?? { paid: false }}
                          onChange={(value) => changePick(line.id, value)}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {short.length > 0 && (
          <div className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{tr('Omborda yetmaydi', 'Не хватает на складе')}</p>
              {short.map((item) => (
                <p key={item.key} className="tabular-nums">
                  {stockItemName(db, item.key)}: {tr('kerak', 'нужно')} {formatNumber(item.need)}, {tr('bor', 'есть')} {formatNumber(item.have)}
                </p>
              ))}
            </div>
          </div>
        )}

        {order.fulfillment === 'delivery' && (
          <Field
            label={tr('Yetkazish narxi (mijoz bilan kelishilgan)', 'Стоимость доставки (согласована с клиентом)')}
            htmlFor="delivery-fee"
            hint={tr("Kuryerga to'lanadi, foydaga kirmaydi", 'Оплачивается курьеру, в прибыль не входит')}
          >
            <input
              id="delivery-fee"
              inputMode="numeric"
              value={fee ? formatNumber(fee) : ''}
              placeholder="0"
              disabled={finished}
              onChange={(event) => changeFee(Number(event.target.value.replace(/\D/g, '').slice(0, 9)) || 0)}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        )}

        {order.status === 'ready' && (
          <div>
            <p className="title-section mb-2 text-neutral-500">{tr("To'lov turi", 'Способ оплаты')}</p>
            <PaymentPicker value={payment} onChange={setPayment} />
          </div>
        )}

        <div className="space-y-1 rounded border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm tabular-nums">
          <div className="flex justify-between text-neutral-600">
            <span>{tr('Atirlar', 'Ароматы')}</span>
            <span>{formatMoney(totals.goods)}</span>
          </div>
          {totals.flakons > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>{tr('Flakonlar', 'Флаконы')}</span>
              <span>{formatMoney(totals.flakons)}</span>
            </div>
          )}
          {order.fulfillment === 'delivery' && (
            <div className="flex justify-between text-neutral-600">
              <span>{tr('Yetkazish', 'Доставка')}</span>
              <span>{formatMoney(totals.delivery)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-base font-bold text-neutral-900">
            <span>{tr('Jami', 'Итого')}</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
          {order.payment && (
            <p className="text-right text-xs text-neutral-500">
              {tr("To'lov", 'Оплата')}: {PAYMENT_LABEL[order.payment]}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
