import { useMemo } from 'react'
import { useDb, useShopMeta } from '@/data/db'
import { isAvailable } from '@/domain/stock'
import type { Db, ID, Lang, Product } from '@/domain/types'

/** Mijoz ilovasi uchun katalog yordamchilari: faol atirlar, sotuv reytingi, brend va sinf nomlari. */

/**
 * Oxirgi 30 kunda berilgan buyurtmalardagi qatorlar soni (atir bo'yicha) — "Хиты продаж" va "Популярные". Server
 * hisoblaydi (`/shop/catalog` → `sales30d`): mijoz boshqalarning buyurtmalarini ko'rmaydi.
 */
export function useSalesCount(): Map<ID, number> {
  return useShopMeta().sales
}

export function useActiveProducts(): Product[] {
  const { products } = useDb()
  return useMemo(() => products.filter((product) => product.active), [products])
}

export function brandName(db: Db, product: Product): string {
  return db.brands.find((brand) => brand.id === product.brandId)?.name ?? ''
}

/** Sinf kategoriyalari ("PREMIUM", "TOP") — nom yonida " - PREMIUM" bo'lib ko'rinadi. */
export function classLabel(db: Db, product: Product, lang: Lang): string {
  return db.categories
    .filter((category) => category.group === 'class' && product.categoryIds.includes(category.id))
    .map((category) => category.name[lang] || category.name.ru)
    .join(' · ')
}

/** "Louis Vuitton Symphony - PREMIUM" */
export function displayName(db: Db, product: Product, lang: Lang): string {
  const suffix = classLabel(db, product, lang)
  return suffix ? `${product.name} - ${suffix}` : product.name
}

/** Razliv yoki original flakondan biri bormi. */
export function inStock(db: Db, product: Product): boolean {
  return isAvailable(db, 'gram', product.id) || (product.bottle !== null && isAvailable(db, 'bottle', product.id))
}
