import { Eye, EyeOff, MessageSquare, Star, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { http } from '@/api/http'
import Badge from '@/components/admin/Badge'
import { confirmDanger } from '@/components/admin/confirm'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { selectClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import type { Review } from '@/domain/types'
import { formatDate, formatNumber, formatPhone } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'

type Visibility = 'all' | 'visible' | 'hidden'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={13} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
      ))}
    </span>
  )
}

/** Admin → Sharhlar: mijozlar yozgan sharhlar (faqat buyurtmasi berilgandan keyin); yashirish va o'chirish. */
export default function ReviewsPage() {
  useDocumentTitle(tr('Sharhlar', 'Отзывы'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [rating, setRating] = useState(0)
  const [visibility, setVisibility] = useState<Visibility>('all')

  const productName = useMemo(() => new Map(db.products.map((product) => [product.id, product.name])), [db.products])
  const customers = useMemo(() => new Map(db.customers.map((customer) => [customer.id, customer])), [db.customers])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return db.reviews
      .filter((review) => {
        if (rating && review.rating !== rating) return false
        if (visibility === 'visible' && review.hidden) return false
        if (visibility === 'hidden' && !review.hidden) return false
        if (needle && !`${productName.get(review.productId) ?? ''} ${review.name} ${review.text}`.toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [db.reviews, query, rating, visibility, productName])
  const { pageItems, pagination } = usePagination(filtered, `${query}|${rating}|${visibility}`)

  const total = db.reviews.length
  const average = total ? db.reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0
  const hiddenCount = db.reviews.filter((review) => review.hidden).length
  const averageText = average.toFixed(1).replace('.', ',')

  const toggle = async (review: Review) => {
    if ((await commit(() => http.patch(`/reviews/${review.id}`, { hidden: !review.hidden }))) === null) return
    showToast(review.hidden ? tr("Sharh ko'rsatildi", 'Отзыв показан') : tr('Sharh yashirildi', 'Отзыв скрыт'))
  }

  const remove = async (review: Review) => {
    if (
      !(await confirmDanger(
        tr("Sharhni o'chirish", 'Удаление отзыва'),
        tr(`${review.name} yozgan sharh butunlay o'chiriladi.`, `Отзыв от ${review.name} будет удалён полностью.`),
      ))
    )
      return
    if ((await commit(() => http.delete(`/reviews/${review.id}`))) === null) return
    showToast(tr("Sharh o'chirildi", 'Отзыв удалён'))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Sharhlar', 'Отзывы')}
        description={tr(
          `${formatNumber(total)} ta sharh · o'rtacha baho ${averageText} · yashirilgan ${hiddenCount} ta`,
          `${formatNumber(total)} ${ruPlural(total, 'отзыв', 'отзыва', 'отзывов')} · средняя оценка ${averageText} · скрыто ${hiddenCount}`,
        )}
      />
      <Card>
        <div className="flex flex-col gap-2 border-b border-neutral-200 p-4 md:flex-row md:items-center">
          <div className="md:w-80">
            <SearchInput value={query} onChange={setQuery} placeholder={tr('Atir, mijoz yoki matn', 'Аромат, клиент или текст')} />
          </div>
          <select aria-label={tr('Baho', 'Оценка')} value={rating} onChange={(event) => setRating(Number(event.target.value))} className={`${selectClass} h-9 md:w-40`}>
            <option value={0}>{tr('Barcha baholar', 'Все оценки')}</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {'★'.repeat(value)} ({value})
              </option>
            ))}
          </select>
          <SegmentedControl
            label={tr("Ko'rinishi", 'Видимость')}
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'all', label: tr('Hammasi', 'Все') },
              { value: 'visible', label: tr("Ko'rinadi", 'Видимые') },
              { value: 'hidden', label: tr('Yashirilgan', 'Скрытые') },
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={MessageSquare} title={tr('Sharh topilmadi', 'Отзывы не найдены')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Sana', 'Дата')}</th>
                  <th className={thClass}>{tr('Atir', 'Аромат')}</th>
                  <th className={thClass}>{tr('Mijoz', 'Клиент')}</th>
                  <th className={thClass}>{tr('Baho', 'Оценка')}</th>
                  <th className={thClass}>{tr('Sharh', 'Отзыв')}</th>
                  <th className={thClass}>{tr('Holat', 'Статус')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((review) => {
                  const customer = customers.get(review.customerId)
                  return (
                    <tr key={review.id} className={`hover:bg-neutral-50 ${review.hidden ? 'opacity-60' : ''}`}>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(review.createdAt)}</td>
                      <td className={tdClass}>
                        <Link to={`/admin/products/${review.productId}`} className="font-semibold text-neutral-900 hover:text-brand-700">
                          {productName.get(review.productId) ?? review.productId}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        <p className="text-neutral-800">{customer?.name ?? review.name}</p>
                        {customer?.phone && <p className="text-xs text-neutral-500">{formatPhone(customer.phone)}</p>}
                      </td>
                      <td className={tdClass}>
                        <Stars rating={review.rating} />
                      </td>
                      <td className="max-w-md min-w-64 px-3 py-2.5 align-middle text-neutral-700">
                        <p className="line-clamp-2" title={review.text}>
                          {review.text}
                        </p>
                      </td>
                      <td className={tdClass}>
                        {review.hidden ? <Badge>{tr('Yashirilgan', 'Скрыт')}</Badge> : <Badge tone="success">{tr("Ko'rinadi", 'Виден')}</Badge>}
                      </td>
                      <td className={tdClass}>
                        <div className="flex justify-end gap-1">
                          <IconButton label={review.hidden ? tr("Ko'rsatish", 'Показать') : tr('Yashirish', 'Скрыть')} onClick={() => void toggle(review)}>
                            {review.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                          </IconButton>
                          <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(review)}>
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
