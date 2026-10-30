import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useDb } from '@/data/db'
import { balanceOf, isAvailable, stockKey } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { displayName } from '../catalog'
import { grams as gramsText, money, useLang, useT } from '../i18n'
import { addToCart, useCustomer, type CartKind } from '../store'
import { haptic } from '../telegram'
import { customerToast } from '../toast'
import Sheet from './Sheet'

type Props = {
  product: Product
  onClose: () => void
}

/**
 * Hajm tanlash (namunadagi "Минимальный объём 50 г" oynasi): razliv — gramm (eng kami do'kon sozlamasidan, tayyor
 * tugmalar bilan), original flakon — dona. Narx darhol hisoblanadi, ombordagi qoldiqdan ko'p tanlab bo'lmaydi.
 */
export default function VolumeSheet({ product, onClose }: Props) {
  const t = useT()
  const lang = useLang()
  const db = useDb()
  const { cart } = useCustomer()
  const { minGrams, gramChips } = db.settings

  const gramOk = isAvailable(db, 'gram', product.id)
  const bottleOk = product.bottle !== null && isAvailable(db, 'bottle', product.id)
  const [kind, setKind] = useState<CartKind>(gramOk || !bottleOk ? 'gram' : 'bottle')
  const [gramInput, setGramInput] = useState(String(minGrams))
  const [bottles, setBottles] = useState(1)

  const inCart = (k: CartKind) => cart.find((line) => line.productId === product.id && line.kind === k)?.qty ?? 0
  const gramLeft = Math.max(0, balanceOf(db, stockKey('gram', product.id)).qty - inCart('gram'))
  const bottleLeft = Math.max(0, balanceOf(db, stockKey('bottle', product.id)).qty - inCart('bottle'))

  const grams = Number(gramInput.replace(/\D/g, '')) || 0
  const gramError = grams < minGrams ? t.volume.tooSmall(minGrams) : grams > gramLeft ? t.volume.tooMuch(gramLeft) : null
  const bottleError = bottles > bottleLeft ? t.volume.bottleStock(bottleLeft) : null
  const error = kind === 'gram' ? gramError : bottleError
  const total = kind === 'gram' ? grams * product.pricePerGram : bottles * (product.bottle?.price ?? 0)

  const submit = () => {
    if (error) return
    addToCart(product.id, kind, kind === 'gram' ? grams : bottles)
    haptic('success')
    customerToast(t.common.added)
    onClose()
  }

  const modeClass = (active: boolean) =>
    `flex min-w-0 flex-1 cursor-pointer flex-col items-start rounded border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'}`

  return (
    <Sheet
      title={kind === 'gram' ? t.volume.title(minGrams) : t.volume.choose}
      subtitle={
        <>
          {kind === 'gram' && <p>{t.volume.hint(minGrams)}</p>}
          <p className="font-medium text-neutral-700">{displayName(db, product, lang)}</p>
        </>
      }
      onClose={onClose}
      closeLabel={t.common.close}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost h-12 flex-1 rounded text-sm font-semibold">
            {t.common.cancel}
          </button>
          <button type="button" onClick={submit} disabled={!!error} className="btn-primary h-12 flex-1 rounded text-sm font-semibold">
            {t.common.addToCart}
          </button>
        </>
      }
    >
      {product.bottle && (
        <div className="mb-3 flex gap-2">
          <button type="button" disabled={!gramOk} onClick={() => setKind('gram')} className={modeClass(kind === 'gram')}>
            <span className="text-sm font-semibold">{t.common.razliv}</span>
            <span className="text-xs text-neutral-500">
              {money(product.pricePerGram, t)} {t.common.perGram}
            </span>
          </button>
          <button type="button" disabled={!bottleOk} onClick={() => setKind('bottle')} className={modeClass(kind === 'bottle')}>
            <span className="text-sm font-semibold">{t.volume.originalOf(product.bottle.volumeMl)}</span>
            <span className="text-xs text-neutral-500">{money(product.bottle.price, t)}</span>
          </button>
        </div>
      )}

      <div className="rounded bg-neutral-100 p-3">
        <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
          {kind === 'gram' ? t.volume.volume : t.volume.quantity}
        </p>
        {kind === 'gram' ? (
          <>
            <label className="flex h-12 items-center rounded border border-neutral-200 bg-white px-3 focus-within:border-brand-700">
              <input
                value={gramInput}
                onChange={(event) => setGramInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
                inputMode="numeric"
                aria-label={t.volume.volume}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-neutral-900"
              />
              <span className="text-sm text-neutral-500">{t.common.g}</span>
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {gramChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setGramInput(String(chip))}
                  className={`h-11 cursor-pointer rounded border text-sm font-semibold transition-colors ${grams === chip ? 'border-brand-700 bg-brand-700 text-white' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'}`}
                >
                  {formatNumber(chip)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {gramsText(grams || 0, t)} — {money(grams * product.pricePerGram, t)}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBottles((n) => Math.max(1, n - 1))}
              aria-label={t.cart.decrease}
              className="btn-ghost flex h-11 w-11 items-center justify-center rounded"
            >
              <Minus size={18} />
            </button>
            <span className="min-w-10 text-center text-lg font-semibold tabular-nums">{bottles}</span>
            <button
              type="button"
              onClick={() => setBottles((n) => n + 1)}
              aria-label={t.cart.increase}
              className="btn-ghost flex h-11 w-11 items-center justify-center rounded"
            >
              <Plus size={18} />
            </button>
            <span className="text-xs text-neutral-500">{t.volume.bottleStock(bottleLeft)}</span>
          </div>
        )}
        {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-600">{t.volume.price}</span>
        <span className="text-xl font-bold text-brand-700 tabular-nums">{error && kind === 'gram' && grams < minGrams ? '—' : money(total, t)}</span>
      </div>
    </Sheet>
  )
}
