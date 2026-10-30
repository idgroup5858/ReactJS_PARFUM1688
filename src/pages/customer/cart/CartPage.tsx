import { FlaskConical, Minus, Plus, ShoppingBag, Trash } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import Img from '@/components/ui/Img'
import { useCart } from '@/customer/cart'
import ShortageNote from '@/customer/components/ShortageNote'
import EmptyBlock from '@/customer/components/EmptyBlock'
import { displayName } from '@/customer/catalog'
import { grams, money, useLang, useT } from '@/customer/i18n'
import { removeFromCart, setCartQty } from '@/customer/store'
import { useDb } from '@/data/db'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/**
 * Savat: qatorlar (razliv grammda — do'kondagi eng kam hajm qadami bilan, original — donada), jami summa, razliv
 * bo'lsa — flakon haqida eslatma.
 */
export default function CartPage() {
  const t = useT()
  const lang = useLang()
  const db = useDb()
  const navigate = useNavigate()
  const { lines, total, missing } = useCart()
  const { minGrams } = db.settings
  useDocumentTitle(t.cart.title)

  if (lines.length === 0) {
    return (
      <div className="px-4 py-5">
        <h1 className="mb-4 text-[15px] font-bold tracking-[0.08em] uppercase">{t.cart.title}</h1>
        <EmptyBlock
          icon={ShoppingBag}
          title={t.cart.empty}
          message={t.cart.emptyHint(minGrams)}
          action={
            <Link to="/catalog" className="btn-primary flex h-11 items-center rounded px-5 text-sm font-semibold">
              {t.common.toCatalog}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-end justify-between">
        <h1 className="text-[15px] font-bold tracking-[0.08em] uppercase">{t.cart.title}</h1>
        <span className="text-sm text-neutral-500">{t.cart.items(lines.length)}</span>
      </div>

      <div className="space-y-2.5">
        {lines.map((line) => {
          // qadam = eng kam hajm (sozlamadan); kamaytirganda eng kam hajmdan pastga tushmaydi (75 g → 50 g)
          const step = line.kind === 'gram' ? minGrams : 1
          const minimum = line.kind === 'gram' ? minGrams : 1
          const name = displayName(db, line.product, lang)
          return (
            <article key={`${line.productId}-${line.kind}`} className="flex gap-3 rounded border border-neutral-200 bg-white p-3">
              <Link to={`/product/${line.productId}`} className="bg-photo h-[84px] w-[72px] shrink-0 overflow-hidden rounded-sm">
                <Img path={line.product.image} alt={name} fit="contain" className="h-full w-full p-1.5" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2">
                  <Link to={`/product/${line.productId}`} className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug text-neutral-900">
                    {name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId, line.kind)}
                    aria-label={t.cart.remove}
                    title={t.cart.remove}
                    className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash size={16} />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {line.kind === 'gram'
                    ? `${t.common.razliv} · ${money(line.unitPrice, t)} ${t.common.perGram}`
                    : t.volume.originalOf(line.product.bottle?.volumeMl ?? 0)}
                </p>
                {/* tor ekranda katta summa sig'masa — stepper ostiga tushadi (karta chetidan chiqmaydi) */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-2">
                  <div className="flex min-w-0 items-center rounded border border-neutral-200">
                    <button
                      type="button"
                      disabled={line.qty <= minimum}
                      onClick={() => setCartQty(line.productId, line.kind, Math.max(minimum, line.qty - step))}
                      aria-label={t.cart.decrease}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center text-neutral-600 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
                      {line.kind === 'gram' ? grams(line.qty, t) : `${line.qty} ${t.common.pcs}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCartQty(line.productId, line.kind, line.qty + step)}
                      aria-label={t.cart.increase}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center text-neutral-600"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <span className="ml-auto text-[15px] font-bold whitespace-nowrap text-brand-700 tabular-nums">{money(line.total, t)}</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* flakonni kassir faqat razliv qatoriga tanlaydi — faqat original bo'lsa eslatma kerak emas */}
      {lines.some((line) => line.kind === 'gram') && (
        <div className="flex gap-2.5 rounded border border-brand-200 bg-brand-50 p-3 text-sm text-neutral-700">
          <FlaskConical size={18} className="mt-0.5 shrink-0 text-brand-700" />
          <p>{t.cart.flakonNote}</p>
        </div>
      )}

      <ShortageNote missing={missing} />

      <div className="rounded border border-neutral-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-neutral-700">{t.cart.total}</span>
          <span className="text-2xl font-bold text-brand-700 tabular-nums">{money(total, t)}</span>
        </div>
        <button
          type="button"
          disabled={missing.length > 0}
          onClick={() => navigate('/checkout')}
          className="btn-primary mt-4 h-12 w-full rounded text-[15px] font-semibold"
        >
          {t.cart.checkout}
        </button>
      </div>
    </div>
  )
}
