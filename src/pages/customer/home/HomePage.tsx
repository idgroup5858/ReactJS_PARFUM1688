import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useActiveProducts, useSalesCount } from '@/customer/catalog'
import CategoryTile from '@/customer/components/CategoryTile'
import ProductGrid from '@/customer/components/ProductGrid'
import ProductRail from '@/customer/components/ProductRail'
import SearchBar from '@/customer/components/SearchBar'
import SectionTitle from '@/customer/components/SectionTitle'
import { useT } from '@/customer/i18n'
import { useDb } from '@/data/db'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import BannerCarousel from './BannerCarousel'

/** Bosh sahifa (namunadagi tartibda): banner, qidiruv, kategoriyalar, yangi kelganlar, xitlar, barcha atirlar. */
export default function HomePage() {
  useDocumentTitle()
  const t = useT()
  const db = useDb()
  const navigate = useNavigate()
  const products = useActiveProducts()
  const sales = useSalesCount()

  const families = useMemo(
    () => db.categories.filter((category) => category.group === 'family').sort((a, b) => a.sort - b.sort),
    [db.categories],
  )
  const byPopularity = useMemo(() => [...products].sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0)), [products, sales])
  const newArrivals = useMemo(() => products.filter((product) => product.isNew), [products])
  const hits = useMemo(() => byPopularity.filter((product) => (sales.get(product.id) ?? 0) > 0).slice(0, 10), [byPopularity, sales])

  return (
    <div>
      <BannerCarousel />
      <div className="space-y-8 px-4 pt-4 pb-6">
        <SearchBar onSubmit={(query) => navigate(query ? `/catalog?q=${encodeURIComponent(query)}` : '/catalog')} />

        {families.length > 0 && (
          <section>
            <SectionTitle title={t.home.categories} to="/categories" linkLabel={t.common.all} />
            <div className="grid grid-cols-3 gap-2.5">
              {families.slice(0, 6).map((category) => (
                <CategoryTile key={category.id} category={category} />
              ))}
            </div>
          </section>
        )}

        {newArrivals.length > 0 && (
          <section>
            <SectionTitle title={t.home.newArrivals} to="/catalog?filter=new" linkLabel={t.common.all} />
            <ProductRail products={newArrivals} />
          </section>
        )}

        {hits.length > 0 && (
          <section>
            <SectionTitle title={t.home.hits} to="/catalog?sort=popular" linkLabel={t.common.all} />
            <ProductRail products={hits} />
          </section>
        )}

        <section>
          <SectionTitle title={t.home.allProducts} to="/catalog" linkLabel={t.home.filters} />
          <ProductGrid products={byPopularity} />
        </section>
      </div>
    </div>
  )
}
