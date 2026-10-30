import { useState } from 'react'
import { Link } from 'react-router'
import Img from '@/components/ui/Img'
import { useDb } from '@/data/db'
import type { Product } from '@/domain/types'
import { displayName, inStock } from '../catalog'
import { money, useLang, useT } from '../i18n'
import FavoriteButton from './FavoriteButton'
import VolumeSheet from './VolumeSheet'

type Props = {
  product: Product
  /** rail — gorizontal lentadagi qat'iy kenglikdagi karta, grid — 2 ustunli to'r */
  variant?: 'rail' | 'grid'
}

/**
 * Atir kartasi (namunadagidek): kulrang fonda flakon, "НОВИНКА" belgisi, ♡, nom + sinf, 1 g narxi va
 * "В корзину" (hajm tanlash oynasini ochadi).
 */
export default function ProductCard({ product, variant = 'grid' }: Props) {
  const t = useT()
  const lang = useLang()
  const db = useDb()
  const [choosing, setChoosing] = useState(false)
  const available = inStock(db, product)
  const name = displayName(db, product, lang)

  return (
    <article
      className={`flex flex-col overflow-hidden rounded border border-neutral-200 bg-white ${variant === 'rail' ? 'w-[165px] shrink-0 snap-start' : 'min-w-0'}`}
    >
      <Link to={`/product/${product.id}`} className="group flex flex-1 flex-col">
        <div className="bg-photo relative aspect-square overflow-hidden">
          <Img
            path={product.image}
            alt={name}
            fit="contain"
            className={`h-full w-full p-3 transition-transform duration-300 group-hover:scale-[1.03] ${available ? '' : 'opacity-60 grayscale'}`}
          />
          {product.isNew && (
            <span className="absolute top-2 left-2 rounded-sm bg-brand-fill px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
              {t.common.badgeNew}
            </span>
          )}
          <span className="absolute top-2 right-2">
            <FavoriteButton productId={product.id} />
          </span>
        </div>
        <div className="flex flex-1 flex-col px-3 pt-3">
          <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] leading-[1.3] text-neutral-900">{name}</h3>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
            <span className="text-base font-bold whitespace-nowrap text-brand-700 tabular-nums">{money(product.pricePerGram, t)}</span>
            <span className="text-[11px] whitespace-nowrap text-neutral-500">{t.common.perGram}</span>
          </p>
        </div>
      </Link>
      <div className="p-3 pt-2.5">
        <button
          type="button"
          disabled={!available}
          onClick={() => setChoosing(true)}
          className="btn-primary h-10 w-full rounded text-sm font-semibold"
        >
          {available ? t.common.addToCart : t.common.outOfStock}
        </button>
      </div>
      {choosing && <VolumeSheet product={product} onClose={() => setChoosing(false)} />}
    </article>
  )
}
