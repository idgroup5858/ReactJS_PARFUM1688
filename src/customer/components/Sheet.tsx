import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: ReactNode
  onClose: () => void
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Telefonda pastdan chiqadigan panel, keng ekranda — markazdagi oyna (hajm tanlash, filtrlar, sharh yozish).
 * Ochiq turganda orqadagi sahifa skroll bo'lmaydi.
 */
export default function Sheet({ title, subtitle, onClose, closeLabel, children, footer }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="page-enter flex max-h-[92vh] w-full max-w-[560px] flex-col rounded-t border border-neutral-200 bg-white shadow-2xl sm:max-w-md sm:rounded"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-bold text-brand-800">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="-mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 gap-2 border-t border-neutral-200 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
