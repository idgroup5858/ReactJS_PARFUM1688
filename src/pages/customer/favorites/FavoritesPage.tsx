import { Heart } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import EmptyBlock from '@/customer/components/EmptyBlock'
import ProductGrid from '@/customer/components/ProductGrid'
import { useT } from '@/customer/i18n'
import { useCustomer } from '@/customer/store'
import { useDb } from '@/data/db'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/** Sevimlilar: ♡ bosilgan atirlar (oxirgi qo'shilgani birinchi). */
export default function FavoritesPage() {
  const t = useT()
  const db = useDb()
  const { favorites } = useCustomer()
  useDocumentTitle(t.favorites.title)

  const products = useMemo(
    () => favorites.map((id) => db.products.find((product) => product.id === id && product.active)).filter((product) => product !== undefined),
    [favorites, db.products],
  )

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-[15px] font-bold tracking-[0.08em] uppercase">{t.favorites.title}</h1>
      {products.length === 0 ? (
        <EmptyBlock
          icon={Heart}
          title={t.favorites.empty}
          message={t.favorites.emptyHint}
          action={
            <Link to="/catalog" className="btn-primary flex h-11 items-center rounded px-5 text-sm font-semibold">
              {t.common.toCatalog}
            </Link>
          }
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  )
}
