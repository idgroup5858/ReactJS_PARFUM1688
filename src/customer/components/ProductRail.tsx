import type { Product } from '@/domain/types'
import ProductCard from './ProductCard'

/**
 * Gorizontal lenta (Новинки, Хиты продаж): kartalar qat'iy kenglikda, barmoq bilan suriladi. `scroll-px-4` —
 * kartalar sahifa chetiga emas, 16px ichkariga "yopishadi" (sarlavha va to'r bilan bir chiziqda).
 */
export default function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="rail" />
      ))}
    </div>
  )
}
