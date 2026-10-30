import { Heart } from 'lucide-react'
import { useT } from '../i18n'
import { toggleFavorite, useCustomer } from '../store'

type Props = {
  productId: string
  /** card — rasm ustidagi kichik oq tugma, large — atir sahifasidagi katta tugma */
  variant?: 'card' | 'large'
}

/** ♡ — sevimlilarga qo'shish / olish. */
export default function FavoriteButton({ productId, variant = 'card' }: Props) {
  const t = useT()
  const active = useCustomer().favorites.includes(productId)
  const label = active ? t.common.favoriteRemove : t.common.favoriteAdd
  const size = variant === 'card' ? 'h-8 w-8' : 'h-12 w-12'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(productId)
      }}
      className={`${size} flex shrink-0 cursor-pointer items-center justify-center rounded border border-neutral-200 bg-white text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50`}
    >
      <Heart size={variant === 'card' ? 17 : 21} className={active ? 'fill-current' : ''} />
    </button>
  )
}
