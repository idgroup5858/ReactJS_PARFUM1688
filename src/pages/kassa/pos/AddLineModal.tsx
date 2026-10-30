import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass } from '@/components/ui/styles'
import { useDb } from '@/data/db'
import { balanceOf, stockKey } from '@/domain/stock'
import type { OrderLine, Product } from '@/domain/types'
import { newId } from '@/lib/id'
import { formatMoney, formatNumber } from '@/lib/format'
import { tr } from '@/staff/i18n'
import FlakonPicker, { type FlakonPick } from '../FlakonPicker'
import { defaultFlakonId } from '../kassaUtils'

type Props = {
  product: Product
  /** tahrirlash: savatdagi qator */
  initial?: OrderLine
  onSubmit: (line: OrderLine) => void
  onClose: () => void
}

type Mode = 'gram' | 'bottle'

/**
 * Savatga qator: Razliv — gramm (eng kami — sozlamalardagi umumiy qoida) + tara (tekin / pullik), yoki Original
 * flakon donada (atir original sotilsa).
 */
export default function AddLineModal({ product, initial, onSubmit, onClose }: Props) {
  const db = useDb()
  const { minGrams, gramChips } = db.settings
  const [mode, setMode] = useState<Mode>(initial?.kind ?? 'gram')
  const [grams, setGrams] = useState(initial?.kind === 'gram' ? initial.qty : minGrams)
  // tahrirlashda saqlangan tara o'zgarishsiz olinadi — "Flakonsiz" qator ham flakonsiz qoladi
  const editingGram = initial?.kind === 'gram'
  const [pick, setPick] = useState<FlakonPick>(() =>
    editingGram
      ? { flakonId: initial.flakon?.flakonId, paid: initial.flakon?.paid ?? false }
      : { flakonId: defaultFlakonId(db.flakons, minGrams), paid: false },
  )
  // kassir tarani o'zi tanlagan bo'lsa, gramm o'zgarganda almashtirilmaydi; saqlangan tara hajmga mos avtomatik tanlov
  // bilan bir xil bo'lsa — hali "tegilmagan" hisoblanadi va hajm bilan birga o'zgaradi
  const [flakonTouched, setFlakonTouched] = useState(
    () => editingGram && initial.flakon?.flakonId !== defaultFlakonId(db.flakons, initial.qty),
  )
  const [pieces, setPieces] = useState(initial?.kind === 'bottle' ? initial.qty : 1)

  const setGramsAndFlakon = (value: number) => {
    setGrams(value)
    if (!flakonTouched) setPick((current) => ({ ...current, flakonId: defaultFlakonId(db.flakons, value) }))
  }

  const gramStock = balanceOf(db, stockKey('gram', product.id)).qty
  const bottleStock = balanceOf(db, stockKey('bottle', product.id)).qty
  const flakon = db.flakons.find((item) => item.id === pick.flakonId)
  const tooFew = mode === 'gram' && grams < minGrams
  const sum =
    mode === 'gram' ? grams * product.pricePerGram + (pick.paid && flakon ? flakon.price : 0) : pieces * (product.bottle?.price ?? 0)

  const submit = () => {
    if (tooFew) return
    const id = initial?.id ?? newId()
    const line: OrderLine =
      mode === 'gram'
        ? {
            id,
            productId: product.id,
            kind: 'gram',
            name: product.name,
            qty: grams,
            unitPrice: product.pricePerGram,
            flakon: flakon ? { flakonId: flakon.id, paid: pick.paid, price: flakon.price } : undefined,
          }
        : { id, productId: product.id, kind: 'bottle', name: product.name, qty: pieces, unitPrice: product.bottle?.price ?? 0 }
    onSubmit(line)
  }

  return (
    <Modal
      title={initial ? tr('Qatorni tahrirlash', 'Редактирование строки') : tr("Savatga qo'shish", 'Добавить в чек')}
      onClose={onClose}
      size="wide"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost h-12 flex-1 rounded text-sm font-semibold">
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={submit} disabled={tooFew} className="btn-primary h-12 flex-[2] rounded text-sm font-semibold tabular-nums">
            {initial ? tr('Saqlash', 'Сохранить') : tr("Qo'shish", 'Добавить')} · {formatMoney(sum)}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Img path={product.image} alt={product.name} fit="contain" className="bg-photo h-16 w-16 shrink-0 rounded p-1" />
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900">{product.name}</p>
            <p className="text-xs text-neutral-500 tabular-nums">
              {formatMoney(product.pricePerGram)} / 1 {tr('g', 'г')}
              {product.bottle
                ? ` · ${tr('original', 'оригинал')} ${product.bottle.volumeMl} ${tr('ml', 'мл')} — ${formatMoney(product.bottle.price)}`
                : ''}
            </p>
          </div>
        </div>

        {product.bottle && (
          <SegmentedControl
            label={tr('Sotish turi', 'Тип продажи')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'gram', label: tr('Razliv (gramm)', 'Розлив (граммы)') },
              { value: 'bottle', label: tr(`Original ${product.bottle.volumeMl} ml`, `Оригинал ${product.bottle.volumeMl} мл`) },
            ]}
          />
        )}

        {mode === 'gram' ? (
          <>
            <div>
              <p className="title-section mb-2 text-neutral-500">{tr('Hajm', 'Объём')}</p>
              <div className="grid grid-cols-4 gap-2">
                {gramChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setGramsAndFlakon(chip)}
                    className={`h-12 cursor-pointer rounded border text-sm font-semibold tabular-nums transition-colors ${grams === chip ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'}`}
                  >
                    {chip} {tr('g', 'г')}
                  </button>
                ))}
              </div>
              <div className="relative mt-2">
                <input
                  inputMode="numeric"
                  aria-label={tr('Gramm', 'Граммы')}
                  value={grams || ''}
                  onChange={(event) => setGramsAndFlakon(Number(event.target.value.replace(/\D/g, '').slice(0, 5)) || 0)}
                  className={`${inputClass} h-12 pr-10 text-base font-semibold tabular-nums ${tooFew ? 'border-red-700!' : ''}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-400">{tr('g', 'г')}</span>
              </div>
              <p className={`mt-1 text-xs tabular-nums ${tooFew ? 'font-semibold text-red-700' : grams > gramStock ? 'font-semibold text-amber-700' : 'text-neutral-500'}`}>
                {tooFew
                  ? tr(`Eng kami ${minGrams} g`, `Минимум ${minGrams} г`)
                  : tr(`Omborda: ${formatNumber(gramStock)} g`, `На складе: ${formatNumber(gramStock)} г`)}
                {!tooFew && grams > gramStock && tr(' — yetmaydi', ' — не хватает')}
              </p>
            </div>
            <div>
              <p className="title-section mb-2 text-neutral-500">{tr('Flakon (tara)', 'Флакон (тара)')}</p>
              <FlakonPicker
                grams={grams}
                value={pick}
                onChange={(value) => {
                  // faqat tekin / pullik almashsa tara tanlangan hisoblanmaydi — hajm o'zgarsa flakon ham kattalashadi
                  if (value.flakonId !== pick.flakonId) setFlakonTouched(true)
                  setPick(value)
                }}
              />
            </div>
          </>
        ) : (
          <div>
            <p className="title-section mb-2 text-neutral-500">{tr('Soni', 'Количество')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPieces((value) => Math.max(1, value - 1))}
                aria-label={tr('Kamaytirish', 'Уменьшить')}
                className="btn-icon flex h-12 w-12 items-center justify-center rounded"
              >
                <Minus size={18} />
              </button>
              <span className="w-16 text-center text-xl font-bold tabular-nums">{pieces}</span>
              <button type="button" onClick={() => setPieces((value) => value + 1)} aria-label={tr("Ko'paytirish", 'Увеличить')} className="btn-icon flex h-12 w-12 items-center justify-center rounded">
                <Plus size={18} />
              </button>
              <span className={`ml-2 text-xs tabular-nums ${pieces > bottleStock ? 'font-semibold text-amber-700' : 'text-neutral-500'}`}>
                {tr('Omborda', 'На складе')}: {formatNumber(bottleStock)} {tr('dona', 'шт.')}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
