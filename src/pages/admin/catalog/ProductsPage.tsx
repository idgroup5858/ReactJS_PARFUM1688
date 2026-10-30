import { Pencil, Plus, Power, SprayCan, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { http } from '@/api/http'
import Badge from '@/components/admin/Badge'
import { confirmDanger } from '@/components/admin/confirm'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { buttonClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { GENDER_LABELS, GENDERS } from '@/domain/presets'
import { balanceOf, isLowStock, stockKey } from '@/domain/stock'
import type { Db, Gender, ID, Product } from '@/domain/types'
import { formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, tr } from '@/staff/i18n'

type StatusFilter = 'all' | 'active' | 'inactive' | 'new'

const statusOptions = (): { value: StatusFilter; label: string }[] => [
  { value: 'all', label: tr('Hammasi', 'Все') },
  { value: 'active', label: tr('Faol', 'Активные') },
  { value: 'inactive', label: tr('Nofaol', 'Неактивные') },
  { value: 'new', label: tr('Yangi', 'Новинки') },
]

/** Atir buyurtma, prixod yoki ombor harakatlarida ishlatilganmi — bunday atirni o'chirib bo'lmaydi (tarix buziladi). */
function isReferenced(db: Db, productId: ID): boolean {
  const keys = [stockKey('gram', productId), stockKey('bottle', productId)]
  return (
    db.orders.some((order) => order.lines.some((line) => line.productId === productId)) ||
    db.purchases.some((purchase) => purchase.lines.some((line) => keys.includes(line.key))) ||
    db.movements.some((movement) => keys.includes(movement.key))
  )
}

const setActive = (productId: ID, active: boolean) => commit(() => http.patch(`/products/${productId}/active`, { active }))

/** Admin → Atirlar: qidiruv, filtrlar, sahifalash; tahrirlash, faolligini almashtirish, o'chirish. */
export default function ProductsPage() {
  useDocumentTitle(tr('Atirlar', 'Ароматы'))
  const db = useDb()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const brandName = useMemo(() => new Map(db.brands.map((brand) => [brand.id, brand.name])), [db.brands])
  const categoryName = useMemo(() => new Map(db.categories.map((category) => [category.id, loc(category.name)])), [db.categories])
  const sortedCategories = useMemo(() => [...db.categories].sort((a, b) => a.sort - b.sort), [db.categories])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return db.products
      .filter((product) => {
        if (needle && !`${product.name} ${brandName.get(product.brandId) ?? ''}`.toLowerCase().includes(needle)) return false
        if (brandId && product.brandId !== brandId) return false
        if (categoryId && !product.categoryIds.includes(categoryId)) return false
        if (gender && product.gender !== gender) return false
        if (status === 'active' && !product.active) return false
        if (status === 'inactive' && product.active) return false
        if (status === 'new' && !product.isNew) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.products, query, brandId, categoryId, gender, status, brandName])

  const { pageItems, pagination } = usePagination(filtered, `${query}|${brandId}|${categoryId}|${gender}|${status}`)

  const remove = async (product: Product) => {
    if (isReferenced(db, product.id)) {
      const result = await AppSwal.fire({
        title: tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        text: tr(
          `"${product.name}" buyurtma yoki ombor tarixida bor — o'chirilsa hisobotlar buziladi. ${product.active ? "Uning o'rniga nofaol qilinsinmi? Nofaol atir mijoz ilovasida ko'rinmaydi." : ''}`,
          `«${product.name}» есть в истории заказов или склада — удаление испортит отчёты. ${product.active ? 'Сделать его неактивным? Неактивный аромат не виден в приложении клиента.' : ''}`,
        ),
        icon: 'info',
        showCancelButton: product.active,
        showConfirmButton: true,
        confirmButtonText: product.active ? tr('Nofaol qilish', 'Сделать неактивным') : tr('Tushunarli', 'Понятно'),
      })
      if (result.isConfirmed && product.active && (await setActive(product.id, false)) !== null) {
        showToast(tr('Atir nofaol qilindi', 'Аромат стал неактивным'))
      }
      return
    }
    if (!(await confirmDanger(tr("Atirni o'chirish", 'Удаление аромата'), tr(`"${product.name}" butunlay o'chiriladi.`, `«${product.name}» будет удалён полностью.`)))) return
    // sharhlari va ombor qatorlari ham serverda o'chadi
    if ((await commit(() => http.delete(`/products/${product.id}`))) === null) return
    showToast(tr("Atir o'chirildi", 'Аромат удалён'))
  }

  const total = db.products.length
  const activeCount = db.products.filter((product) => product.active).length

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Atirlar', 'Ароматы')}
        description={tr(
          `Katalogdagi atirlar: ${formatNumber(total)} ta, faol — ${formatNumber(activeCount)} ta`,
          `Ароматов в каталоге: ${formatNumber(total)}, активных — ${formatNumber(activeCount)}`,
        )}
        actions={
          <Link to="/admin/products/new" className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi atir', 'Новый аромат')}
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <SearchInput value={query} onChange={setQuery} placeholder={tr("Nomi yoki brend bo'yicha qidirish", 'Поиск по названию или бренду')} />
            <select aria-label={tr('Brend', 'Бренд')} value={brandId} onChange={(event) => setBrandId(event.target.value)} className={`${selectClass} h-9`}>
              <option value="">{tr('Barcha brendlar', 'Все бренды')}</option>
              {[...db.brands]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
            </select>
            <select aria-label={tr('Kategoriya', 'Категория')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={`${selectClass} h-9`}>
              <option value="">{tr('Barcha kategoriyalar', 'Все категории')}</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {loc(category.name)}
                </option>
              ))}
            </select>
            <select aria-label={tr('Jinsi', 'Пол')} value={gender} onChange={(event) => setGender(event.target.value as Gender | '')} className={`${selectClass} h-9`}>
              <option value="">{tr('Barcha jinslar', 'Любой пол')}</option>
              {GENDERS.map((item) => (
                <option key={item} value={item}>
                  {loc(GENDER_LABELS[item])}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl label={tr('Holat', 'Статус')} options={statusOptions()} value={status} onChange={setStatus} />
            <span className="text-xs text-neutral-500 tabular-nums">
              {tr('Topildi', 'Найдено')}: {formatNumber(filtered.length)}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={SprayCan} title={tr('Atir topilmadi', 'Ароматы не найдены')} message={tr("Qidiruv yoki filtrlarni o'zgartirib ko'ring", 'Попробуйте изменить поиск или фильтры')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Atir', 'Аромат')}</th>
                  <th className={thClass}>{tr('Kategoriyalar', 'Категории')}</th>
                  <th className={`${thClass} text-right`}>{tr('Narx / 1 g', 'Цена / 1 г')}</th>
                  <th className={thClass}>{tr('Original flakon', 'Оригинальный флакон')}</th>
                  <th className={`${thClass} text-right`}>{tr('Qoldiq', 'Остаток')}</th>
                  <th className={thClass}>{tr('Holat', 'Статус')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((product) => {
                  const grams = balanceOf(db, stockKey('gram', product.id)).qty
                  const bottles = product.bottle ? balanceOf(db, stockKey('bottle', product.id)).qty : null
                  const lowGrams = isLowStock(db, stockKey('gram', product.id))
                  return (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-neutral-50 ${product.active ? '' : 'opacity-60'}`}
                    >
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <div className="bg-photo h-12 w-12 shrink-0 overflow-hidden rounded">
                            <Img path={product.image} alt={product.name} fit="contain" className="h-full w-full p-1" />
                          </div>
                          <div className="min-w-0">
                            {/* uzun nom ikki qatorga bo'linadi — jadval tor ekranda (sidebar ochiq) karta ichiga sig'sin */}
                            <p title={product.name} className="line-clamp-2 max-w-64 font-semibold whitespace-normal text-neutral-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {brandName.get(product.brandId) ?? '—'} · {loc(GENDER_LABELS[product.gender])}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {product.categoryIds.map((id) => (
                            <span key={id} className="rounded bg-neutral-100 px-1.5 py-px text-[11px] text-neutral-600">
                              {categoryName.get(id) ?? id}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(product.pricePerGram)}</td>
                      <td className={`${tdClass} tabular-nums`}>
                        {product.bottle ? (
                          <>
                            <p className="text-neutral-800">{formatMoney(product.bottle.price)}</p>
                            <p className="text-xs text-neutral-500">
                              {formatNumber(product.bottle.volumeMl)} {tr('ml', 'мл')}
                            </p>
                          </>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        <p className={lowGrams ? 'font-semibold text-amber-700' : 'text-neutral-800'}>
                          {formatNumber(grams)} {tr('g', 'г')}
                        </p>
                        {bottles !== null && (
                          <p className="text-xs text-neutral-500">
                            {formatNumber(bottles)} {tr('dona', 'шт.')}
                          </p>
                        )}
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-1">
                          {product.isNew && <Badge tone="brand">{tr('Yangi', 'Новинка')}</Badge>}
                          {product.active ? <Badge tone="success">{tr('Faol', 'Активен')}</Badge> : <Badge>{tr('Nofaol', 'Неактивен')}</Badge>}
                          {lowGrams && <Badge tone="warning">{tr('Kam qoldi', 'Мало')}</Badge>}
                        </div>
                      </td>
                      <td className={tdClass} onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/products/${product.id}`}
                            aria-label={tr('Tahrirlash', 'Редактировать')}
                            title={tr('Tahrirlash', 'Редактировать')}
                            className="btn-icon flex h-8 w-8 items-center justify-center rounded"
                          >
                            <Pencil size={15} />
                          </Link>
                          <IconButton
                            label={product.active ? tr('Nofaol qilish', 'Сделать неактивным') : tr('Faol qilish', 'Сделать активным')}
                            active={product.active}
                            onClick={async () => {
                              if ((await setActive(product.id, !product.active)) === null) return
                              showToast(product.active ? tr('Atir nofaol qilindi', 'Аромат стал неактивным') : tr('Atir faol qilindi', 'Аромат снова активен'))
                            }}
                          >
                            <Power size={15} />
                          </IconButton>
                          <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(product)}>
                            <Trash size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} />
      </Card>
    </div>
  )
}
