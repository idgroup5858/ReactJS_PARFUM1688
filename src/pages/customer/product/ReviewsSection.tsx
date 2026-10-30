import { Star } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { errorText } from '@/api/errors'
import { http } from '@/api/http'
import Sheet from '@/customer/components/Sheet'
import { useT } from '@/customer/i18n'
import { useCustomer } from '@/customer/store'
import { customerToast } from '@/customer/toast'
import type { Product, Review } from '@/domain/types'
import { formatDate, formatNumber } from '@/lib/format'

const REVIEWS_STEP = 3

type ProductReviews = {
  reviews: Pick<Review, 'id' | 'name' | 'rating' | 'text' | 'createdAt'>[]
  average: number
  count: number
  /** shu atirni xarid qilgan ("Berildi") va hali sharh yozmagan */
  canReview: boolean
  reviewed: boolean
}

/** Atir sharhlari serverdan (`GET /shop/products/:id/reviews`) — qurilma tokeni bo'lsa, yozish huquqi bilan. */
function useProductReviews(productId: string, token: string | undefined) {
  const [data, setData] = useState<ProductReviews | null>(null)
  const load = useCallback(
    () =>
      http
        .get<ProductReviews>(`/shop/products/${encodeURIComponent(productId)}/reviews`, undefined, { token: token ?? null })
        .then(setData)
        .catch(() => setData((current) => current ?? { reviews: [], average: 0, count: 0, canReview: false, reviewed: false })),
    [productId, token],
  )
  useEffect(() => {
    void load()
  }, [load])
  return { data, reload: load }
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-current' : 'text-neutral-300'} />
      ))}
    </span>
  )
}

/**
 * Sharhlar: yashirilmaganlari ko'rinadi. Yozish faqat shu atir bo'lgan buyurtmasi "Berildi" bo'lgan mijozga
 * (bitta atirga bitta sharh).
 */
export default function ReviewsSection({ product }: { product: Product }) {
  const t = useT()
  const { token, lang } = useCustomer()
  const { data, reload } = useProductReviews(product.id, token)
  const [writing, setWriting] = useState(false)
  const [sending, setSending] = useState(false)
  const [shown, setShown] = useState(REVIEWS_STEP)

  const reviews = data?.reviews ?? []
  const average = data?.average ?? 0
  const canReview = !!token && !!data?.canReview
  const reviewed = !!data?.reviewed

  const send = async (rating: number, text: string) => {
    if (!token || sending) return
    setSending(true)
    try {
      await http.post(`/shop/products/${encodeURIComponent(product.id)}/reviews`, { rating, text }, { token })
      customerToast(t.product.reviewThanks)
      setWriting(false)
      await reload()
    } catch (error) {
      customerToast(errorText(error, lang), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-[0.08em] text-neutral-900 uppercase">{t.product.reviews}</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              <Stars value={average} />
              <span className="tabular-nums">
                {formatNumber(average, 1)} · {reviews.length}
              </span>
            </div>
          )}
        </div>
        {canReview ? (
          <button type="button" onClick={() => setWriting(true)} className="btn-outline h-9 shrink-0 rounded px-3 text-sm font-semibold">
            {t.product.writeReview}
          </button>
        ) : (
          <p className="max-w-[55%] text-right text-xs text-neutral-500">{reviewed ? t.product.alreadyReviewed : t.product.reviewHint}</p>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-300 bg-white px-4 py-6 text-center text-sm text-neutral-500">{t.product.noReviews}</div>
      ) : (
        <div className="space-y-2.5">
          {reviews.slice(0, shown).map((review) => (
            <article key={review.id} className="rounded border border-neutral-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-900">{review.name}</span>
                <span className="text-xs text-neutral-400">{formatDate(review.createdAt)}</span>
              </div>
              <div className="mt-1">
                <Stars value={review.rating} size={13} />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{review.text}</p>
            </article>
          ))}
          {reviews.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + REVIEWS_STEP)} className="btn-outline h-11 w-full rounded text-sm font-semibold">
              {t.common.showMore} ({reviews.length - shown})
            </button>
          )}
        </div>
      )}

      {writing && canReview && <ReviewSheet sending={sending} onClose={() => setWriting(false)} onSend={(rating, text) => void send(rating, text)} />}
    </section>
  )
}

function ReviewSheet({ sending, onClose, onSend }: { sending: boolean; onClose: () => void; onSend: (rating: number, text: string) => void }) {
  const t = useT()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  return (
    <Sheet
      title={t.product.writeReview}
      onClose={onClose}
      closeLabel={t.common.close}
      footer={
        <button
          type="button"
          disabled={text.trim().length < 3 || sending}
          onClick={() => onSend(rating, text.trim())}
          className="btn-primary h-12 flex-1 rounded text-sm font-semibold"
        >
          {t.product.send}
        </button>
      }
    >
      <p className="mb-2 text-xs font-semibold text-neutral-500">{t.product.yourRating}</p>
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}`} className="cursor-pointer p-1 text-amber-500">
            <Star size={30} className={n <= rating ? 'fill-current' : 'text-neutral-300'} />
          </button>
        ))}
      </div>
      <label className="mb-1 block text-xs font-semibold text-neutral-500">{t.product.reviewText}</label>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        placeholder={t.product.reviewPlaceholder}
        className="w-full resize-none rounded border border-neutral-200 bg-white px-3 py-2 text-[15px]"
      />
    </Sheet>
  )
}
