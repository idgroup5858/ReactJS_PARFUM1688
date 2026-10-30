import { useState } from 'react'
import type { Product } from '@/domain/types'
import { useT } from '../i18n'
import ProductCard from './ProductCard'

const STEP = 10

type Props = {
  products: Product[]
  /** filtr o'zgarsa — yana 10 tadan boshlanadi */
  resetKey?: string
}

/** 2 ustunli atirlar to'ri, "Показать ещё" bilan (har safar 10 tadan). */
export default function ProductGrid({ products, resetKey = '' }: Props) {
  const t = useT()
  const [state, setState] = useState({ key: resetKey, count: STEP })
  const count = state.key === resetKey ? state.count : STEP
  const visible = products.slice(0, count)

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length > count && (
        <button
          type="button"
          onClick={() => setState({ key: resetKey, count: count + STEP })}
          className="btn-outline mt-4 h-11 w-full rounded text-sm font-semibold"
        >
          {t.common.showMore} ({products.length - count})
        </button>
      )}
    </div>
  )
}
