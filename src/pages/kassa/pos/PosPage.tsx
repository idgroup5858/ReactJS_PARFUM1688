import { ChevronUp, SearchX, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'
import { LayerContext, useEscapeLayer } from '@/components/ui/useEscapeLayer'
import { useDb } from '@/data/db'
import { orderTotals } from '@/domain/orders'
import { balanceOf, stockKey } from '@/domain/stock'
import type { OrderLine, Product } from '@/domain/types'
import { formatMoney } from '@/lib/format'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { loc, ruPlural, tr } from '@/staff/i18n'
import AddLineModal from './AddLineModal'
import CartPanel from './CartPanel'
import ProductTile from './ProductTile'
import { putLine, usePosCart } from './posCart'

/** 'all' | 'bottle' (original flakoni bor atirlar) | kategoriya id si */
type Filter = string

/** lg dan tor ekranda (planshet, telefon) pastda doim ko'rinadigan chek paneli: qatorlar soni, jami, ochish. */
function CartBar({ onOpen }: { onOpen: () => void }) {
  const cart = usePosCart()
  const count = cart.lines.length
  const { total } = orderTotals({ lines: cart.lines, deliveryFee: 0 })
  const rows = tr(`${count} ta qator`, `${count} ${ruPlural(count, 'строка', 'строки', 'строк')}`)
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={onOpen}
        aria-label={count ? tr(`Chek: ${rows}, jami ${formatMoney(total)}`, `Чек: ${rows}, итого ${formatMoney(total)}`) : tr("Chek bo'sh", 'Чек пуст')}
        className={`${count ? 'btn-primary' : 'btn-outline'} flex h-12 w-full items-center gap-3 rounded px-4 text-sm font-semibold tabular-nums`}
      >
        <ShoppingCart size={20} className="shrink-0" />
        <span className="truncate">{count ? `${tr('Chek', 'Чек')} · ${rows}` : tr("Chek bo'sh", 'Чек пуст')}</span>
        <span className="ml-auto shrink-0 text-base font-bold">{formatMoney(total)}</span>
        <ChevronUp size={18} className="shrink-0" />
      </button>
    </div>
  )
}

/**
 * Chek oynasi (lg dan tor ekranda): telefonda pastdan chiqadi, planshetda markazda. Esc / fon — yopadi; ustidan
 * qator tahrirlash oynasi ochilsa, Esc avval o'shani yopadi (useEscapeLayer navbati).
 */
function CartSheet({ onEdit, onClose }: { onEdit: (line: OrderLine) => void; onClose: () => void }) {
  const layer = useEscapeLayer(onClose)
  return (
    <LayerContext value={layer}>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <div role="dialog" aria-modal="true" aria-label={tr('Chek', 'Чек')} className="page-enter flex max-h-[92dvh] w-full max-w-lg flex-col sm:max-h-full">
          <CartPanel onEdit={onEdit} onClose={onClose} onPaid={onClose} className="shadow-2xl" />
        </div>
      </div>
    </LayerContext>
  )
}

/**
 * Sotuv (POS) — do'konga kelgan mijozlar uchun: chapda atirlar (qidiruv, kategoriya), bosilsa hajm va tara
 * tanlanadi; o'ngda chek, to'lov turi va "To'lash" (buyurtma darhol "Berildi" bo'lib, ombordan chiqadi).
 * lg dan tor ekranda chek pastki panel orqali ochiladi — kassir barcha atirlar ostiga aylantirib tushmaydi.
 */
export default function PosPage() {
  const db = useDb()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [dialog, setDialog] = useState<{ product: Product; line?: OrderLine } | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const closeCart = () => setCartOpen(false)

  const brands = useMemo(() => new Map(db.brands.map((brand) => [brand.id, brand.name])), [db.brands])
  const chips = useMemo(
    () => [
      { id: 'all', label: tr('Hammasi', 'Все') },
      { id: 'bottle', label: tr('Original flakon', 'Оригинальный флакон') },
      ...[...db.categories].sort((a, b) => a.sort - b.sort).map((category) => ({ id: category.id, label: loc(category.name) })),
    ],
    [db.categories],
  )

  const products = useMemo(() => {
    const query = search.trim().toLowerCase()
    return db.products
      .filter((product) => product.active)
      .filter((product) => (filter === 'all' ? true : filter === 'bottle' ? product.bottle !== null : product.categoryIds.includes(filter)))
      .filter((product) => !query || product.name.toLowerCase().includes(query) || (brands.get(product.brandId) ?? '').toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.products, filter, search, brands])

  const openEdit = (line: OrderLine) => {
    const product = db.products.find((item) => item.id === line.productId)
    if (product) setDialog({ product, line })
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start ${wide ? '' : 'pb-20'}`}>
      <section className="min-w-0 flex-1 space-y-3">
        <div className="sticky top-14 z-10 -mx-3 space-y-2 bg-page px-3 pt-1 pb-2 sm:-mx-4 sm:px-4">
          <SearchInput value={search} onChange={setSearch} placeholder={tr('Atir yoki brend nomi', 'Название аромата или бренда')} />
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`h-9 shrink-0 cursor-pointer rounded border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${filter === chip.id ? 'border-brand-700 bg-brand-fill text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={tr('Atir topilmadi', 'Аромат не найден')}
            message={tr("Qidiruv yoki kategoriyani o'zgartiring", 'Измените поиск или категорию')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                brand={brands.get(product.brandId) ?? ''}
                grams={balanceOf(db, stockKey('gram', product.id)).qty}
                bottles={balanceOf(db, stockKey('bottle', product.id)).qty}
                minGrams={db.settings.minGrams}
                onPick={() => setDialog({ product })}
              />
            ))}
          </div>
        )}
      </section>

      {wide ? (
        <div className="w-[380px] shrink-0">
          <CartPanel onEdit={openEdit} className="sticky top-[72px] max-h-[calc(100vh-88px)]" />
        </div>
      ) : (
        <CartBar onOpen={() => setCartOpen(true)} />
      )}

      {cartOpen && !wide && <CartSheet onEdit={openEdit} onClose={closeCart} />}

      {dialog && (
        <AddLineModal
          key={`${dialog.product.id}-${dialog.line?.id ?? 'new'}`}
          product={dialog.product}
          initial={dialog.line}
          onClose={() => setDialog(null)}
          onSubmit={(line) => {
            putLine(line)
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
