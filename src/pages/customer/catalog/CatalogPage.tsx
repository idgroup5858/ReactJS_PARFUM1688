import { ChevronDown, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { brandName, inStock, useActiveProducts, useSalesCount } from '@/customer/catalog'
import { usePageTitle } from '@/customer/chrome'
import EmptyBlock from '@/customer/components/EmptyBlock'
import ProductGrid from '@/customer/components/ProductGrid'
import SearchBar from '@/customer/components/SearchBar'
import { money, useLang, useLoc, useT } from '@/customer/i18n'
import { useDb } from '@/data/db'
import { GENDERS, GENDER_LABELS } from '@/domain/presets'
import type { Product } from '@/domain/types'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import OptionSheet from './OptionSheet'
import PriceSheet from './PriceSheet'

type SortKey = 'popular' | 'new' | 'priceAsc' | 'priceDesc' | 'name'
type QuickFilter = 'stock' | 'new' | 'bottle'
type OpenSheet = 'category' | 'gender' | 'price' | 'brand' | 'sort' | null

const SORTS: SortKey[] = ['popular', 'new', 'priceAsc', 'priceDesc', 'name']

/**
 * Katalog: qidiruv, filtrlar (kategoriya, jins, narx, brend), tezkor chiplar, saralash va "Показать ещё".
 * Hamma tanlov manzilda (?q=&category=&gender=&brand=&min=&max=&filter=&sort=) — bosh sahifadagi havolalar shu yerga.
 */
export default function CatalogPage() {
  const t = useT()
  const lang = useLang()
  const loc = useLoc()
  const db = useDb()
  const products = useActiveProducts()
  const sales = useSalesCount()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<OpenSheet>(null)
  usePageTitle(t.catalog.title)
  useDocumentTitle(t.catalog.title)

  const q = params.get('q') ?? ''
  // qidiruv maydonidagi matn sahifaning o'zida: manzil (?q=) router o'tishi bilan kechikib yangilanadi — maydonni
  // unga bog'lasak tez yozganda harflar yo'qolardi. "Сбросить" ikkalasini birga tozalaydi.
  const [text, setText] = useState(q)
  const category = params.get('category')
  const gender = params.get('gender')
  const brand = params.get('brand')
  const min = params.get('min') ? Number(params.get('min')) : null
  const max = params.get('max') ? Number(params.get('max')) : null
  const quick = (params.get('filter') as QuickFilter | null) ?? null
  const sort = (SORTS.find((key) => key === params.get('sort')) ?? 'popular') as SortKey

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )

  const result = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const matches = (product: Product) => {
      if (!needle) return true
      const noteNames = [...product.notes.top, ...product.notes.middle, ...product.notes.base]
        .map((id) => db.notes.find((note) => note.id === id)?.name[lang] ?? '')
        .join(' ')
      return `${product.name} ${brandName(db, product)} ${noteNames}`.toLowerCase().includes(needle)
    }
    const list = products.filter(
      (product) =>
        matches(product) &&
        (!category || product.categoryIds.includes(category)) &&
        (!gender || product.gender === gender) &&
        (!brand || product.brandId === brand) &&
        (min === null || product.pricePerGram >= min) &&
        (max === null || product.pricePerGram <= max) &&
        (quick !== 'stock' || inStock(db, product)) &&
        (quick !== 'new' || product.isNew) &&
        (quick !== 'bottle' || product.bottle !== null),
    )
    const sorted = [...list]
    if (sort === 'popular') sorted.sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0))
    if (sort === 'new') sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt))
    if (sort === 'priceAsc') sorted.sort((a, b) => a.pricePerGram - b.pricePerGram)
    if (sort === 'priceDesc') sorted.sort((a, b) => b.pricePerGram - a.pricePerGram)
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [products, db, lang, q, category, gender, brand, min, max, quick, sort, sales])

  const sortLabels: Record<SortKey, string> = {
    popular: t.catalog.sortPopular,
    new: t.catalog.sortNew,
    priceAsc: t.catalog.sortPriceAsc,
    priceDesc: t.catalog.sortPriceDesc,
    name: t.catalog.sortName,
  }
  const categoryOptions = [...db.categories]
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({ value: item.id, label: loc(item.name) }))
  const brandOptions = [...db.brands]
    .filter((item) => products.some((product) => product.brandId === item.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ value: item.id, label: item.name, hint: String(products.filter((product) => product.brandId === item.id).length) }))

  const categoryName = category ? categoryOptions.find((option) => option.value === category)?.label : null
  const brandLabel = brand ? db.brands.find((item) => item.id === brand)?.name : null
  const genderLabel = gender && gender in GENDER_LABELS ? loc(GENDER_LABELS[gender as keyof typeof GENDER_LABELS]) : null
  const priceLabel = min !== null || max !== null ? t.catalog.priceRange(min !== null ? money(min, t) : null, max !== null ? money(max, t) : null) : null
  const hasFilters = Boolean(q || category || gender || brand || min !== null || max !== null || quick)
  const resetAll = () => {
    setText('')
    setParams({}, { replace: true })
  }

  const dropClass = (active: boolean) =>
    `flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded border px-3.5 text-sm transition-colors ${active ? 'border-brand-700 bg-brand-50 font-semibold text-brand-700' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'}`
  const chipClass = (active: boolean) =>
    `h-9 shrink-0 cursor-pointer rounded border px-3 text-[13px] transition-colors ${active ? 'border-brand-fill bg-brand-fill font-semibold text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'}`

  return (
    <div className="space-y-3 px-4 py-4">
      <SearchBar
        value={text}
        onSubmit={(value) => set({ q: value || null })}
        onChange={(value) => {
          setText(value)
          set({ q: value || null })
        }}
      />

      {/* qator suriladi — tanlangan qiymat to'liq ko'rinadi (kesilmaydi: "3 000 so'mdan 6 000 s…" bo'lmasin) */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button type="button" onClick={() => setOpen('category')} className={dropClass(!!categoryName)}>
          <span className="whitespace-nowrap">{categoryName ?? t.catalog.category}</span>
          <ChevronDown size={15} />
        </button>
        <button type="button" onClick={() => setOpen('gender')} className={dropClass(!!genderLabel)}>
          <span className="whitespace-nowrap">{genderLabel ?? t.catalog.gender}</span>
          <ChevronDown size={15} />
        </button>
        <button type="button" onClick={() => setOpen('price')} className={dropClass(!!priceLabel)}>
          <span className="whitespace-nowrap">{priceLabel ?? t.catalog.price}</span>
          <ChevronDown size={15} />
        </button>
        <button type="button" onClick={() => setOpen('brand')} className={dropClass(!!brandLabel)}>
          <span className="whitespace-nowrap">{brandLabel ?? t.catalog.brand}</span>
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4">
        <button type="button" onClick={() => set({ filter: null })} className={chipClass(quick === null)}>
          {t.common.all}
        </button>
        <button type="button" onClick={() => set({ filter: 'stock' })} className={chipClass(quick === 'stock')}>
          {t.catalog.inStock}
        </button>
        <button type="button" onClick={() => set({ filter: 'new' })} className={chipClass(quick === 'new')}>
          {t.catalog.newOnly}
        </button>
        <button type="button" onClick={() => set({ filter: 'bottle' })} className={chipClass(quick === 'bottle')}>
          {t.catalog.bottleOnly}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* tor ekranda (360px) "Сбросить" bilan sig'masa — saralash nomi ikki qatorga o'tadi, ekrandan chiqmaydi */}
        <button
          type="button"
          onClick={() => setOpen('sort')}
          className="flex min-h-11 min-w-0 cursor-pointer items-center gap-1.5 rounded border border-neutral-200 bg-white px-3.5 py-1 text-left text-sm leading-tight text-neutral-800 transition-colors hover:border-neutral-300"
        >
          <span className="text-neutral-500">{t.catalog.sort}</span>
          <span className="font-semibold">{sortLabels[sort]}</span>
          <ChevronDown size={15} className="shrink-0" />
        </button>
        {hasFilters && (
          <button type="button" onClick={resetAll} className="h-11 shrink-0 cursor-pointer px-1 text-sm font-medium text-brand-700">
            {t.catalog.reset}
          </button>
        )}
      </div>

      <div className="pt-1">
        {result.length > 0 ? (
          <>
            {/* natija soni — surilmaydigan joyda, doim ko'rinib turadi */}
            <p className="mb-2 text-[13px] text-neutral-500 tabular-nums">{t.catalog.count(result.length)}</p>
            <ProductGrid products={result} resetKey={params.toString()} />
          </>
        ) : (
          <EmptyBlock
            icon={SearchX}
            title={t.catalog.nothing}
            message={t.catalog.nothingHint}
            action={
              <button type="button" onClick={resetAll} className="btn-primary h-11 rounded px-5 text-sm font-semibold">
                {t.catalog.reset}
              </button>
            }
          />
        )}
      </div>

      {open === 'category' && (
        <OptionSheet title={t.catalog.category} options={categoryOptions} value={category} onSelect={(value) => set({ category: value })} onClose={() => setOpen(null)} />
      )}
      {open === 'gender' && (
        <OptionSheet
          title={t.catalog.gender}
          options={GENDERS.map((item) => ({ value: item, label: loc(GENDER_LABELS[item]) }))}
          value={gender}
          onSelect={(value) => set({ gender: value })}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'brand' && (
        <OptionSheet
          title={t.catalog.brand}
          options={brandOptions}
          value={brand}
          onSelect={(value) => set({ brand: value })}
          onClose={() => setOpen(null)}
          searchPlaceholder={t.catalog.brandSearch}
        />
      )}
      {open === 'sort' && (
        <OptionSheet
          title={t.catalog.sort.replace(':', '')}
          options={SORTS.map((key) => ({ value: key, label: sortLabels[key] }))}
          value={sort}
          allowAll={false}
          onSelect={(value) => set({ sort: value === 'popular' ? null : value })}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'price' && (
        <PriceSheet
          min={min}
          max={max}
          onApply={(from, to) => set({ min: from === null ? null : String(from), max: to === null ? null : String(to) })}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
