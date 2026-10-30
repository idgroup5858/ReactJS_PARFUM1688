import { ChevronDown, Expand, PackageSearch, Share2, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Img from '@/components/ui/Img'
import { brandName, displayName, inStock } from '@/customer/catalog'
import { usePageTitle } from '@/customer/chrome'
import EmptyBlock from '@/customer/components/EmptyBlock'
import FavoriteButton from '@/customer/components/FavoriteButton'
import VolumeSheet from '@/customer/components/VolumeSheet'
import { money, useLang, useLoc, useT } from '@/customer/i18n'
import { customerToast } from '@/customer/toast'
import { useDb } from '@/data/db'
import { GENDER_LABELS } from '@/domain/presets'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { AccordsBlock, GenderBlock, LongevitySillage, NotesPyramid, SeasonBlock } from './ProductDetails'
import ReviewsSection from './ReviewsSection'

/**
 * Atir sahifasi (namunadagi tartibda): katta rasm (kattalashtirish bilan), brend, nom, narx, hajm tanlash, savat /
 * sevimli / ulashish, notalar piramidasi, akkordlar, mavsum, turg'unlik va shleyf, jins, tavsif, xususiyatlar va
 * sharhlar. Pastda doim ko'rinib turadigan narx + "В корзину".
 */
export default function ProductPage() {
  const { id } = useParams()
  const t = useT()
  const lang = useLang()
  const loc = useLoc()
  const db = useDb()
  const product = db.products.find((item) => item.id === id && item.active)
  const [choosing, setChoosing] = useState(false)
  const [zoom, setZoom] = useState(false)
  usePageTitle(product ? product.name : t.common.notFound)
  useDocumentTitle(product?.name ?? t.common.notFound)

  if (!product) {
    return (
      <div className="p-4">
        <EmptyBlock
          icon={PackageSearch}
          title={t.common.notFound}
          action={
            <Link to="/catalog" className="btn-primary flex h-11 items-center rounded px-5 text-sm font-semibold">
              {t.common.toCatalog}
            </Link>
          }
        />
      </div>
    )
  }

  const name = displayName(db, product, lang)
  const available = inStock(db, product)
  const categories = db.categories.filter((category) => product.categoryIds.includes(category.id)).sort((a, b) => a.sort - b.sort)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: name, url })
      else {
        await navigator.clipboard.writeText(url)
        customerToast(t.common.linkCopied)
      }
    } catch {
      // foydalanuvchi ulashishni bekor qildi
    }
  }

  return (
    <div className="pb-20">
      <div className="bg-photo relative aspect-square max-h-[460px] w-full">
        <Img path={product.image} alt={name} fit="contain" className="h-full w-full p-8" />
        {product.isNew && (
          <span className="absolute top-3 left-3 rounded-sm bg-brand-fill px-2.5 py-1 text-xs font-bold tracking-wide text-white uppercase">
            {t.common.badgeNew}
          </span>
        )}
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={t.product.zoom}
          title={t.product.zoom}
          className="absolute right-3 bottom-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded bg-black/45 text-white shadow-sm hover:bg-black/60"
        >
          <Expand size={18} />
        </button>
      </div>

      <div className="space-y-7 px-4 pt-5">
        <section>
          <Link to={`/catalog?brand=${product.brandId}`} className="text-xs font-bold tracking-[0.16em] text-neutral-500 uppercase hover:text-brand-700">
            {brandName(db, product)}
          </Link>
          <h2 className="mt-1.5 font-serif text-[30px] leading-[1.1] font-medium text-neutral-900">{name}</h2>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-brand-700 tabular-nums">{money(product.pricePerGram, t)}</span>
            <span className="text-sm text-neutral-500">{t.common.perGram}</span>
          </p>
          {product.bottle && (
            <p className="mt-1 text-sm text-neutral-600">
              {t.volume.originalOf(product.bottle.volumeMl)} — <span className="font-semibold text-neutral-900">{money(product.bottle.price, t)}</span>
            </p>
          )}

          <p className="mt-5 mb-1.5 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.volume.volume}</p>
          <button
            type="button"
            disabled={!available}
            onClick={() => setChoosing(true)}
            className="flex h-11 w-full max-w-[220px] cursor-pointer items-center justify-between rounded border border-neutral-200 bg-white px-3 text-sm text-neutral-800 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {available ? `${db.settings.minGrams} ${t.common.g}` : t.common.outOfStock}
            <ChevronDown size={16} className="text-neutral-400" />
          </button>
          <p className="mt-1.5 text-xs text-neutral-500">{t.product.pricePer(db.settings.minGrams)}</p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={!available}
              onClick={() => setChoosing(true)}
              className="btn-primary h-12 flex-1 rounded text-[15px] font-semibold"
            >
              {available ? t.common.addToCart : t.common.outOfStock}
            </button>
            <FavoriteButton productId={product.id} variant="large" />
            <button
              type="button"
              onClick={() => void share()}
              aria-label={t.common.share}
              title={t.common.share}
              className="btn-ghost flex h-12 w-12 shrink-0 items-center justify-center rounded"
            >
              <Share2 size={19} />
            </button>
          </div>
        </section>

        <NotesPyramid product={product} />
        <AccordsBlock product={product} />
        <SeasonBlock product={product} />
        <LongevitySillage product={product} />
        <GenderBlock product={product} />

        <details open className="group rounded border border-neutral-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-[15px] font-bold text-neutral-900 select-none [&::-webkit-details-marker]:hidden">
            <ChevronDown size={18} className="-rotate-90 text-neutral-500 transition-transform group-open:rotate-0" />
            {t.product.description}
          </summary>
          <p className="px-4 pb-4 text-[15px] leading-relaxed text-neutral-700">{loc(product.description)}</p>
        </details>

        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
          <dt className="text-neutral-500">{t.product.brand}</dt>
          <dd>
            <Link to={`/catalog?brand=${product.brandId}`} className="text-neutral-900 hover:text-brand-700">
              {brandName(db, product)}
            </Link>
          </dd>
          <dt className="text-neutral-500">{t.product.category}</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {categories.map((category) => (
              <Link key={category.id} to={`/catalog?category=${category.id}`} className="text-brand-700 hover:underline">
                {loc(category.name)}
              </Link>
            ))}
          </dd>
          <dt className="text-neutral-500">{t.product.gender}</dt>
          <dd>
            <Link to={`/catalog?gender=${product.gender}`} className="text-brand-700 hover:underline">
              {loc(GENDER_LABELS[product.gender])}
            </Link>
          </dd>
        </dl>

        <ReviewsSection product={product} />
      </div>

      {/* pastki menyu ustida doim ko'rinib turadigan narx paneli */}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-2.5">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span className="text-xl font-bold whitespace-nowrap text-brand-700 tabular-nums">{money(product.pricePerGram, t)}</span>
          <span className="text-xs whitespace-nowrap text-neutral-500">{t.common.perGram}</span>
        </p>
        <button
          type="button"
          disabled={!available}
          onClick={() => setChoosing(true)}
          className="btn-primary flex h-11 shrink-0 items-center gap-2 rounded px-5 text-sm font-semibold"
        >
          <ShoppingBag size={17} />
          {available ? t.common.addToCart : t.common.outOfStock}
        </button>
      </div>

      {choosing && <VolumeSheet product={product} onClose={() => setChoosing(false)} />}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <Img path={product.image} alt={name} fit="contain" className="max-h-full w-full max-w-[560px] bg-transparent!" />
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label={t.common.close}
            className="absolute top-4 right-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-white/15 text-white hover:bg-white/25"
          >
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  )
}
