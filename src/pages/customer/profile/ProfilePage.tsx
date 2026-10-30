import { ChevronRight, MapPin, Phone, ReceiptText, User } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import PhoneInput from '@/customer/components/PhoneInput'
import StatusBadge from '@/customer/components/StatusBadge'
import { money, useT } from '@/customer/i18n'
import { setLang, setProfile, useCustomer } from '@/customer/store'
import { customerToast } from '@/customer/toast'
import { useDb } from '@/data/db'
import { orderTotals } from '@/domain/orders'
import { formatDate, formatOrderNumber, formatPhone } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

const STEP = 5

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-[0.08em] text-neutral-900 uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Profil: ism va telefon, til, buyurtmalarim ("Показать ещё" bilan), do'kon manzili va telefoni. */
export default function ProfilePage() {
  const t = useT()
  const db = useDb()
  const customer = useCustomer()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [shown, setShown] = useState(STEP)
  useDocumentTitle(t.profile.title)

  // server qurilma tokeni bo'yicha faqat shu mijozning buyurtmalarini beradi (telefon bo'yicha emas): raqamni bilgan
  // har kim birovning buyurtmalarini ko'rib qolmasin. Token birinchi buyurtmada yoki Telegram'dan ochilganda beriladi.
  const orders = useMemo(
    () => db.orders.filter((order) => order.source === 'bot').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.orders],
  )

  const dirty = name.trim() !== customer.name || phone !== customer.phone

  return (
    <div className="space-y-7 px-4 py-5">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-fill text-white">
          <User size={26} />
        </span>
        <div className="min-w-0">
          <p className="text-xl leading-tight font-bold break-words text-neutral-900">{customer.name || t.profile.guest}</p>
          {customer.phone && <p className="text-sm text-neutral-500">{formatPhone(customer.phone)}</p>}
        </div>
      </div>

      <Section title={t.profile.contacts}>
        <div className="space-y-3 rounded border border-neutral-200 bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-neutral-600">{t.checkout.name}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.checkout.namePlaceholder}
              className="h-12 w-full rounded border border-neutral-200 bg-white px-3 text-[15px]"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-semibold text-neutral-600">{t.checkout.phone}</span>
            <PhoneInput value={phone} onChange={setPhone} label={t.checkout.phone} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div role="radiogroup" aria-label={t.common.language} className="flex items-center gap-1 rounded border border-neutral-200 p-0.5">
              {(['ru', 'uz'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  role="radio"
                  aria-checked={customer.lang === lang}
                  onClick={() => setLang(lang)}
                  className={`h-8 cursor-pointer rounded-sm px-3 text-xs font-semibold transition-colors ${customer.lang === lang ? 'bg-brand-fill text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                >
                  {lang === 'ru' ? 'Русский' : "O'zbekcha"}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setProfile(name, phone)
                customerToast(t.common.saved)
              }}
              className="btn-primary h-10 rounded px-4 text-sm font-semibold"
            >
              {t.common.save}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t.profile.myOrders}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center rounded border border-dashed border-neutral-300 bg-white px-4 py-8 text-center">
            <ReceiptText size={32} className="mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-500">{t.profile.noOrders}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, shown).map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center gap-3 rounded border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 tabular-nums">{formatOrderNumber(order.number)}</span>
                    <StatusBadge order={order} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {formatDate(order.createdAt)} · {order.lines.map((line) => line.name).join(', ')}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold whitespace-nowrap text-brand-700 tabular-nums">{money(orderTotals(order).total, t)}</span>
                <ChevronRight size={18} className="shrink-0 text-neutral-400" />
              </Link>
            ))}
            {orders.length > shown && (
              <button type="button" onClick={() => setShown((n) => n + STEP)} className="btn-outline h-11 w-full rounded text-sm font-semibold">
                {t.common.showMore} ({orders.length - shown})
              </button>
            )}
          </div>
        )}
      </Section>

      <Section title={t.profile.shop}>
        <div className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
          <p className="flex gap-3 p-4 text-sm text-neutral-700">
            <MapPin size={18} className="shrink-0 text-brand-700" />
            {db.settings.address}
          </p>
          <a href={`tel:+${db.settings.phone.replace(/\D/g, '')}`} className="flex items-center gap-3 p-4 text-sm text-neutral-700 hover:bg-neutral-50">
            <Phone size={18} className="shrink-0 text-brand-700" />
            <span className="flex-1">{formatPhone(db.settings.phone)}</span>
            <span className="text-xs font-semibold text-brand-700">{t.profile.call}</span>
          </a>
        </div>
      </Section>
    </div>
  )
}
