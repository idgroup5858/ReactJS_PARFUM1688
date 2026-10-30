import Img from '@/components/ui/Img'
import type { Product } from '@/domain/types'
import { formatMoney, formatNumber } from '@/lib/format'
import { tr } from '@/staff/i18n'

type Props = {
  product: Product
  brand: string
  grams: number
  bottles: number
  minGrams: number
  onPick: () => void
}

/** POS dagi atir plitkasi: kulrang fonda flakon rasmi, nomi, 1 g narxi va qoldiq. */
export default function ProductTile({ product, brand, grams, bottles, minGrams, onPick }: Props) {
  const low = grams < minGrams
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded border border-neutral-200 bg-white text-left transition-colors hover:border-brand-400"
    >
      {/* rasm absolute — baland (portret) rasm 4:3 sahnani cho'zib yubormaydi, qatordagi plitkalar bir xil bo'ladi */}
      <span className="bg-photo relative block aspect-[4/3] w-full shrink-0 overflow-hidden">
        <Img path={product.image} alt={product.name} fit="contain" className="absolute inset-0 h-full w-full p-2 transition-transform group-hover:scale-105" />
        {product.bottle && (
          <span className="absolute top-1.5 left-1.5 rounded border border-neutral-200 bg-white px-1.5 py-px text-[10px] font-bold text-neutral-700">
            {tr('ORIGINAL', 'ОРИГИНАЛ')} · {formatNumber(bottles)}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 p-2.5">
        <span className="truncate text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">{brand}</span>
        <span className="line-clamp-2 min-h-[2.5em] text-sm leading-tight font-semibold text-neutral-900">{product.name}</span>
        <span className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-sm font-bold text-brand-700 tabular-nums">
            {formatMoney(product.pricePerGram)}
            <span className="text-[11px] font-medium text-neutral-400">/{tr('g', 'г')}</span>
          </span>
          <span className={`text-[11px] font-semibold tabular-nums ${low ? 'text-red-700' : 'text-neutral-500'}`}>{formatNumber(grams)} {tr('g', 'г')}</span>
        </span>
      </span>
    </button>
  )
}
