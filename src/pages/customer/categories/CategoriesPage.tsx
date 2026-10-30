import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import Img from '@/components/ui/Img'
import { useActiveProducts } from '@/customer/catalog'
import CategoryTile from '@/customer/components/CategoryTile'
import SectionTitle from '@/customer/components/SectionTitle'
import { useLoc, useT } from '@/customer/i18n'
import { useDb } from '@/data/db'
import { GENDERS, GENDER_LABELS } from '@/domain/presets'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/** Kategoriyalar: aromat oilalari (rasmli to'r), to'plamlar (PREMIUM, TOP) va jins bo'yicha ro'yxat. */
export default function CategoriesPage() {
  const t = useT()
  const loc = useLoc()
  const db = useDb()
  const products = useActiveProducts()
  useDocumentTitle(t.categoriesPage.title)

  const sorted = useMemo(() => [...db.categories].sort((a, b) => a.sort - b.sort), [db.categories])
  const families = sorted.filter((category) => category.group === 'family')
  const classes = sorted.filter((category) => category.group === 'class')
  const countIn = (categoryId: string) => products.filter((product) => product.categoryIds.includes(categoryId)).length

  const rowClass = 'flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-50'

  return (
    <div className="space-y-8 px-4 py-5">
      <section>
        <SectionTitle title={t.categoriesPage.families} />
        <div className="grid grid-cols-3 gap-2.5">
          {families.map((category) => (
            <CategoryTile key={category.id} category={category} />
          ))}
        </div>
      </section>

      {classes.length > 0 && (
        <section>
          <SectionTitle title={t.categoriesPage.classes} />
          <div className="divide-y divide-neutral-100 overflow-hidden rounded border border-neutral-200 bg-white">
            {classes.map((category) => (
              <Link key={category.id} to={`/catalog?category=${category.id}`} className={rowClass}>
                <Img path={category.image} alt={loc(category.name)} className="h-12 w-12 shrink-0 rounded-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold tracking-wide text-neutral-900">{loc(category.name)}</span>
                  <span className="block text-xs text-neutral-500">{t.categoriesPage.products(countIn(category.id))}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-neutral-400" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title={t.product.gender} />
        <div className="divide-y divide-neutral-100 overflow-hidden rounded border border-neutral-200 bg-white">
          {GENDERS.map((gender) => (
            <Link key={gender} to={`/catalog?gender=${gender}`} className={rowClass}>
              <span className="min-w-0 flex-1 text-[15px] text-neutral-900">{loc(GENDER_LABELS[gender])}</span>
              <span className="text-xs text-neutral-500">{products.filter((product) => product.gender === gender).length}</span>
              <ChevronRight size={18} className="shrink-0 text-neutral-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
