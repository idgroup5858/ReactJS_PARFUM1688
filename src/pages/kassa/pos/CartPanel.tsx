import { Pencil, ShoppingCart, Trash2, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { inputClass } from '@/components/ui/styles'
import { commit, getDb, useDb } from '@/data/db'
import { PAYMENT_LABEL } from '@/domain/labels'
import { orderTotals, shortages } from '@/domain/orders'
import { stockItemName } from '@/domain/stock'
import type { Order, OrderLine } from '@/domain/types'
import { formatMoney, formatNumber, formatOrderNumber } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'
import AppSwal from '@/lib/swal'
import { tr } from '@/staff/i18n'
import PaymentPicker from '../PaymentPicker'
import { formatQty, lineSum } from '../kassaUtils'
import { normalizePhone, patchCart, removeLine, resetCart, usePosCart } from './posCart'

type Props = {
  onEdit: (line: OrderLine) => void
  /** joylashuv (keng ekranda — sticky ustun, torida — pastki oyna) */
  className?: string
  /** pastki oynada: ✕ tugmasi */
  onClose?: () => void
  /** sotuv yakunlangach (pastki oyna yopiladi) */
  onPaid?: () => void
}

/** Kassadagi chek: qatorlar, mijoz (ixtiyoriy, telefon bo'yicha qidiriladi), to'lov turi va "To'lash". */
export default function CartPanel({ onEdit, className = '', onClose, onPaid }: Props) {
  const db = useDb()
  const cart = usePosCart()
  const [paying, setPaying] = useState(false)
  const totals = orderTotals({ lines: cart.lines, deliveryFee: 0 })
  const phone = normalizePhone(cart.phone)
  const known = useMemo(() => (phone.length === 12 ? db.customers.find((customer) => customer.phone === phone) : undefined), [db, phone])

  /** Raqam bazadagi mijozniki bo'lsa ism o'zidan qo'yiladi; kassir o'zi yozgan ism esa tegilmaydi. */
  const changePhone = (value: string) => {
    const next = normalizePhone(value)
    const found = next.length === 12 ? getDb().customers.find((customer) => customer.phone === next) : undefined
    const replaceName = cart.nameAuto || !cart.name.trim()
    if (!replaceName) patchCart({ phone: value })
    else if (found?.name) patchCart({ phone: value, name: found.name, nameAuto: true })
    else patchCart({ phone: value, name: cart.nameAuto ? '' : cart.name, nameAuto: false })
  }

  const pay = async () => {
    if (cart.lines.length === 0 || !cart.payment) return
    if (phone && phone.length !== 12) {
      void AppSwal.fire({
        icon: 'warning',
        title: tr('Telefon raqam', 'Номер телефона'),
        text: tr("Raqamni to'liq kiriting (masalan 90 123 45 67) yoki bo'sh qoldiring.", 'Введите номер полностью (например 90 123 45 67) или оставьте пустым.'),
      })
      return
    }
    const short = shortages(db, cart.lines)
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
        confirmButtonText: tr('Baribir sotish', 'Всё равно продать'),
      })
      if (!result.isConfirmed) return
    }
    const payment = cart.payment
    setPaying(true)
    // mijozni server topadi yoki yaratadi (bazadagi ismi kassada qayta yozilmaydi), narxlar — bazadan
    const created = await commit(() =>
      http.post<Order>('/orders', {
        name: cart.name.trim() || undefined,
        phone: phone || undefined,
        payment,
        lines: cart.lines.map((line) => ({
          productId: line.productId,
          kind: line.kind,
          qty: line.qty,
          ...(line.flakon && { flakon: { flakonId: line.flakon.flakonId, paid: line.flakon.paid } }),
        })),
      }),
    )
    setPaying(false)
    if (!created) return
    const order = getDb().orders.find((item) => item.id === created.id) ?? created
    resetCart()
    onPaid?.()
    const result = await AppSwal.fire({
      icon: 'success',
      title: tr('Sotuv yakunlandi', 'Продажа завершена'),
      text: `${formatOrderNumber(order.number)} · ${formatMoney(orderTotals(order).total)} · ${PAYMENT_LABEL[payment]}`,
      showCancelButton: true,
      confirmButtonText: tr('Chek chiqarish', 'Печать чека'),
      cancelButtonText: tr('Yopish', 'Закрыть'),
    })
    if (result.isConfirmed) printReceipt(order, getDb())
  }

  const clear = async () => {
    const result = await AppSwal.fire({
      title: tr('Chekni tozalash', 'Очистить чек'),
      text: tr("Barcha qatorlar o'chirilsinmi?", 'Удалить все строки?'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: tr('Tozalash', 'Очистить'),
    })
    if (result.isConfirmed) resetCart()
  }

  return (
    <aside className={`flex min-h-0 flex-col rounded border border-neutral-200 bg-white ${className}`}>
      <div className={`flex items-center justify-between gap-2 border-b border-neutral-200 py-3 pl-4 ${onClose ? 'pr-2' : 'pr-4'}`}>
        <h2 className="title-section text-brand-800">{tr('Chek', 'Чек')}</h2>
        <div className="flex items-center gap-2">
          {cart.lines.length > 0 && (
            <button type="button" onClick={() => void clear()} className="text-xs font-semibold text-neutral-500 hover:text-red-700">
              {tr('Tozalash', 'Очистить')}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={tr('Yopish', 'Закрыть')}
              title={tr('Yopish', 'Закрыть')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-neutral-400">
            <ShoppingCart size={28} />
            {tr("Atirni tanlang — chekka qo'shiladi", 'Выберите аромат — он добавится в чек')}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {cart.lines.map((line) => {
              const flakon = line.flakon ? db.flakons.find((item) => item.id === line.flakon?.flakonId) : undefined
              return (
                <li key={line.id} className="flex gap-2 px-4 py-2.5">
                  <button type="button" onClick={() => onEdit(line)} className="min-w-0 flex-1 cursor-pointer text-left">
                    <p className="truncate text-sm font-semibold text-neutral-900">{line.name}</p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {line.kind === 'bottle' ? tr('Original · ', 'Оригинал · ') : ''}
                      {formatQty(line)} × {formatMoney(line.unitPrice)}
                    </p>
                    {line.kind === 'gram' && (
                      <p className={`text-xs ${flakon ? 'text-neutral-500' : 'font-semibold text-amber-700'}`}>
                        {flakon
                          ? `${flakon.name} · ${line.flakon?.paid ? formatMoney(line.flakon.price) : tr('tekin', 'бесплатно')}`
                          : tr('Flakonsiz', 'Без флакона')}
                      </p>
                    )}
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                      {formatMoney(lineSum(line) + (line.flakon?.paid ? line.flakon.price : 0))}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onEdit(line)} aria-label={tr('Tahrirlash', 'Редактировать')} title={tr('Tahrirlash', 'Редактировать')} className="btn-icon flex h-8 w-8 items-center justify-center rounded">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        aria-label={tr("O'chirish", 'Удалить')}
                        title={tr("O'chirish", 'Удалить')}
                        className="btn-icon-danger flex h-8 w-8 items-center justify-center rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-neutral-200 p-4">
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="tel"
            aria-label={tr('Mijoz telefoni', 'Телефон клиента')}
            placeholder={tr('Telefon (ixtiyoriy)', 'Телефон (необязательно)')}
            value={cart.phone}
            onChange={(event) => changePhone(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
          <input
            aria-label={tr('Mijoz ismi', 'Имя клиента')}
            placeholder={tr('Ism (ixtiyoriy)', 'Имя (необязательно)')}
            value={cart.name} onChange={(event) => patchCart({ name: event.target.value, nameAuto: false })} className={inputClass} />
        </div>
        {known && (
          <p className="-mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <UserCheck size={14} /> {tr('Mijoz topildi', 'Клиент найден')}: {known.name}
          </p>
        )}

        <div className="space-y-1 text-sm tabular-nums">
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
          <div className="flex justify-between pt-1 text-xl font-bold text-neutral-900">
            <span>{tr('Jami', 'Итого')}</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <PaymentPicker value={cart.payment} onChange={(payment) => patchCart({ payment })} size="lg" />

        <button
          type="button"
          onClick={() => void pay()}
          disabled={cart.lines.length === 0 || !cart.payment || paying}
          className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded text-base font-bold tabular-nums"
        >
          {tr("To'lash", 'Оплатить')} · {formatMoney(totals.total)}
        </button>
      </div>
    </aside>
  )
}
