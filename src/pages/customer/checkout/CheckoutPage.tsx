import { Info, MapPin, Store, Truck } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { errorText, isApiError } from '@/api/errors'
import { http } from '@/api/http'
import { useCart } from '@/customer/cart'
import { usePageTitle } from '@/customer/chrome'
import PhoneInput from '@/customer/components/PhoneInput'
import ShortageNote from '@/customer/components/ShortageNote'
import { grams, money, useT } from '@/customer/i18n'
import { clearCart, clearCustomerSession, setCustomerSession, setProfile, useCustomer } from '@/customer/store'
import { haptic } from '@/customer/telegram'
import { customerToast } from '@/customer/toast'
import { refreshDb, useDb } from '@/data/db'
import type { Fulfillment } from '@/domain/types'
import { addDays, toDateKey } from '@/lib/dates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i) // 10:00 – 21:00

/** Shu paytda tanlab bo'ladigan soatlar: bugun — faqat hali kelmagan soatlar, keyingi kunlar — hammasi. */
function hoursFor(date: string, now: Date): number[] {
  return date === toDateKey(now) ? HOURS.filter((hour) => hour > now.getHours()) : HOURS
}

/**
 * Joriy vaqt (har 30 soniyada yangilanadi): sahifa uzoq ochiq tursa ham bugungi o'tib ketgan soatlar o'chadi,
 * yarim tundan keyin "Сегодня / Завтра" yangi kunga suriladi. `refresh` — darhol yangilash (tasdiqlashda).
 */
function useNow(): [Date, () => void] {
  const [now, setNow] = useState(() => new Date())
  const refresh = useCallback(() => setNow(new Date()), [])
  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(timer)
  }, [refresh])
  return [now, refresh]
}

type PlacedOrder = { order: { id: string }; token: string; customer: { id: string } }

/**
 * Buyurtma serverga (`POST /shop/orders`). Qaysi mijozga yozilishini server qurilma tokeni bo'yicha aniqlaydi
 * (Telegram akkaunti, qurilmaning o'z mijozi, bog'lanmagan raqam) va yangi token qaytaradi. Saqlangan token yaroqsiz
 * bo'lsa (server rad etdi) — tokensiz, birinchi buyurtmadek qayta yuboriladi.
 */
async function placeOrder(body: unknown, token: string | undefined): Promise<PlacedOrder> {
  try {
    return await http.post<PlacedOrder>('/shop/orders', body, { token: token ?? null })
  } catch (error) {
    if (!token || !isApiError(error, 'unauthorized')) throw error
    clearCustomerSession()
    return http.post<PlacedOrder>('/shop/orders', body, { token: null })
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-[12px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Buyurtmani rasmiylashtirish: aloqa, olib ketish / yetkazish (narxini kassir telefonda kelishadi), kun (bugun /
 * ertaga / indinga) va soat, izoh. To'lov qabul qilishda. Tasdiqlansa buyurtma kassa navbatiga "Yangi" bo'lib tushadi
 * (narx va qoldiq serverda qayta tekshiriladi).
 */
export default function CheckoutPage() {
  const t = useT()
  const db = useDb()
  const navigate = useNavigate()
  const customer = useCustomer()
  const { lines, total, missing } = useCart()
  usePageTitle(t.checkout.title)
  useDocumentTitle(t.checkout.title)

  const [now, refreshNow] = useNow()
  const today = toDateKey(now)
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup')
  const [address, setAddress] = useState('')
  // tanlangan kun — sana kaliti (indeks emas): yarim tun o'tsa ham buyurtma o'sha kunga qoladi
  const [date, setDate] = useState(() => {
    const start = new Date()
    const key = toDateKey(start)
    return hoursFor(key, start).length > 0 ? key : addDays(key, 1)
  })
  const [hour, setHour] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [tried, setTried] = useState(false)
  const [placing, setPlacing] = useState(false)

  const hours = hoursFor(date, now)
  // vaqt o'tib, tanlangan kun yoki soat o'tmishda qolsa — tanlov bekor bo'ladi (o'tgan vaqtga buyurtma berilmaydi)
  if (date < today) {
    setDate(today)
    setHour(null)
  } else if (hour !== null && !hours.includes(hour)) {
    setHour(null)
  }

  if (lines.length === 0 && !placing) return <Navigate to="/cart" replace />

  const errors = {
    name: !name.trim() ? t.checkout.nameRequired : null,
    phone: phone.length !== 12 ? t.checkout.phoneInvalid : null,
    address: fulfillment === 'delivery' && address.trim().length < 5 ? t.checkout.addressRequired : null,
    hour: hour === null || !hours.includes(hour) ? t.checkout.hourRequired : null,
  }
  const valid = !Object.values(errors).some(Boolean) && missing.length === 0

  const submit = async () => {
    setTried(true)
    // ekrandagi soatlar 30 soniyagacha eskirgan bo'lishi mumkin — tasdiqlash paytidagi vaqt bilan qayta tekshiriladi
    const at = new Date()
    const expired = hour !== null && (date < toDateKey(at) || !hoursFor(date, at).includes(hour))
    if (!valid || hour === null || expired || placing) {
      if (expired) refreshNow()
      haptic('error')
      return
    }
    setPlacing(true)
    try {
      const result = await placeOrder(
        {
          name: name.trim(),
          phone,
          fulfillment,
          address: fulfillment === 'delivery' ? address.trim() : undefined,
          slot: { date, hour },
          comment: comment.trim() || undefined,
          lines: lines.map((line) => ({ productId: line.productId, kind: line.kind, qty: line.qty })),
        },
        customer.token,
      )
      setProfile(name, phone)
      setCustomerSession(result.token, result.customer.id)
      // "Мои заказы" va qoldiq yangi buyurtma bilan — buyurtma sahifasi uni darhol topsin
      await refreshDb()
      clearCart()
      haptic('success')
      navigate(`/orders/${result.order.id}?placed=1`, { replace: true })
    } catch (error) {
      setPlacing(false)
      haptic('error')
      customerToast(errorText(error, customer.lang), 'error')
      // narx yoki qoldiq o'zgargan bo'lishi mumkin — savat yangi katalog bilan
      void refreshDb()
    }
  }

  const fieldClass = (invalid: boolean) =>
    `h-12 w-full rounded border bg-white px-3 text-[15px] text-neutral-900 ${invalid ? 'border-red-400' : 'border-neutral-200'}`
  const error = (message: string | null) => tried && message && <p className="mt-1 text-xs font-semibold text-red-700">{message}</p>
  const choiceClass = (active: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded border p-3 text-left transition-colors ${active ? 'border-brand-700 bg-brand-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`
  const chipClass = (active: boolean) =>
    `h-10 cursor-pointer rounded border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-brand-fill bg-brand-fill text-white' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'}`
  const days = [t.checkout.today, t.checkout.tomorrow, t.checkout.afterTomorrow].map((label, offset) => ({ label, key: addDays(today, offset) }))

  return (
    <div className="space-y-3 px-4 py-4">
      <Section title={t.checkout.contacts}>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-neutral-600">{t.checkout.name}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.checkout.namePlaceholder}
              autoComplete="name"
              className={fieldClass(tried && !!errors.name)}
            />
            {error(errors.name)}
          </label>
          <div>
            <span className="mb-1 block text-xs font-semibold text-neutral-600">{t.checkout.phone}</span>
            <PhoneInput value={phone} onChange={setPhone} label={t.checkout.phone} invalid={tried && !!errors.phone} />
            {error(errors.phone)}
          </div>
        </div>
      </Section>

      <Section title={t.checkout.receive}>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button type="button" onClick={() => setFulfillment('pickup')} className={choiceClass(fulfillment === 'pickup')}>
            <Store size={20} className={fulfillment === 'pickup' ? 'text-brand-700' : 'text-neutral-400'} />
            <span>
              <span className="block text-[15px] font-semibold text-neutral-900">{t.checkout.pickup}</span>
              <span className="block text-xs text-neutral-500">{t.checkout.pickupHint}</span>
            </span>
          </button>
          <button type="button" onClick={() => setFulfillment('delivery')} className={choiceClass(fulfillment === 'delivery')}>
            <Truck size={20} className={fulfillment === 'delivery' ? 'text-brand-700' : 'text-neutral-400'} />
            <span>
              <span className="block text-[15px] font-semibold text-neutral-900">{t.checkout.delivery}</span>
              <span className="block text-xs text-neutral-500">{t.checkout.deliveryHint}</span>
            </span>
          </button>
        </div>
        {fulfillment === 'delivery' ? (
          <div className="mt-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-neutral-600">{t.checkout.address}</span>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={2}
                placeholder={t.checkout.addressPlaceholder}
                className={`w-full resize-none rounded border bg-white px-3 py-2.5 text-[15px] ${tried && errors.address ? 'border-red-400' : 'border-neutral-200'}`}
              />
            </label>
            {error(errors.address)}
            <p className="mt-2 flex gap-2 text-xs text-neutral-500">
              <Info size={14} className="mt-px shrink-0" />
              {t.checkout.deliveryNote}
            </p>
          </div>
        ) : (
          <p className="mt-3 flex gap-2 text-sm text-neutral-600">
            <MapPin size={16} className="mt-0.5 shrink-0 text-brand-700" />
            <span>
              {t.checkout.shopAddress}: {db.settings.address}
            </span>
          </p>
        )}
      </Section>

      <Section title={t.checkout.time}>
        <div className="grid grid-cols-3 gap-2">
          {days.map((day) => (
            <button key={day.key} type="button" onClick={() => setDate(day.key)} className={chipClass(date === day.key)}>
              {day.label}
            </button>
          ))}
        </div>
        {hours.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">{t.checkout.noHoursToday}</p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {HOURS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={!hours.includes(value)}
                onClick={() => setHour(value)}
                className={`${chipClass(hour === value)} tabular-nums`}
              >
                {String(value).padStart(2, '0')}:00
              </button>
            ))}
          </div>
        )}
        {error(errors.hour)}
      </Section>

      <Section title={t.checkout.comment}>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          placeholder={t.checkout.commentPlaceholder}
          className="w-full resize-none rounded border border-neutral-200 bg-white px-3 py-2.5 text-[15px]"
        />
      </Section>

      <Section title={t.checkout.summary}>
        <ul className="space-y-1.5 text-sm">
          {lines.map((line) => (
            <li key={`${line.productId}-${line.kind}`} className="flex justify-between gap-3">
              <span className="min-w-0 text-neutral-700">
                {line.product.name} ·{' '}
                {line.kind === 'gram' ? grams(line.qty, t) : `${t.volume.originalOf(line.product.bottle?.volumeMl ?? 0)} × ${line.qty}`}
              </span>
              <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{money(line.total, t)}</span>
            </li>
          ))}
          {fulfillment === 'delivery' && (
            <li className="flex justify-between gap-3 text-neutral-500">
              <span>{t.order.deliveryFee}</span>
              <span>{t.order.byAgreement}</span>
            </li>
          )}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-neutral-100 pt-3">
          <span className="font-semibold text-neutral-700">{t.cart.total}</span>
          <span className="text-xl font-bold text-brand-700 tabular-nums">{money(total, t)}</span>
        </div>
        <p className="mt-2 flex gap-2 text-xs text-neutral-500">
          <Info size={14} className="mt-px shrink-0" />
          {t.checkout.payment}
        </p>
      </Section>

      <ShortageNote missing={missing} />

      <button type="button" onClick={() => void submit()} disabled={placing} className="btn-primary h-13 w-full rounded text-[15px] font-semibold">
        {t.checkout.submit}
      </button>
    </div>
  )
}
