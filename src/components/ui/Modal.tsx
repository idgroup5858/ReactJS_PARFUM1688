import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { tr } from '@/staff/i18n'
import { LayerContext, useEscapeLayer } from './useEscapeLayer'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** wide — md dan biroz keng, lg/xl — katta formalar */
  size?: 'sm' | 'md' | 'wide' | 'lg' | 'xl'
  /** false — fon va Esc bilan yopilmaydi */
  dismissable?: boolean
  /** ✕ tugmasi yorlig'i (mijoz ilovasida — o'z tilida) */
  closeLabel?: string
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', wide: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }

/**
 * Ilova oynasi — SweetAlert dialoglari bilan bir xil anatomiya: sarlavha · ✕ → matn → tugmalar.
 * Ustma-ust ochilganda (forma ichida rasm tanlash va h.k.) Esc faqat eng ustidagisini yopadi.
 */
export default function Modal({ title, onClose, children, footer, size = 'md', dismissable = true, closeLabel = tr('Yopish', 'Закрыть') }: Props) {
  const layer = useEscapeLayer(dismissable ? onClose : undefined)

  // body ga chiqariladi: sticky / transform (.page-enter) / z-index li ota-element ichida qolib ketmasin.
  // Kontekst (LayerContext) portal orqali ham o'tadi — ustma-ust oynalarda Esc avvalgidek faqat ustidagini yopadi.
  return createPortal(
    <LayerContext value={layer}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(event) => dismissable && event.target === event.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`page-enter flex max-h-full w-full flex-col overflow-hidden rounded border border-neutral-200 bg-white shadow-2xl ${WIDTHS[size]}`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 py-2.5 pr-3 pl-5">
            <h2 className="title-section text-brand-800">{title}</h2>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex shrink-0 gap-2 border-t border-neutral-200 px-5 py-4">{footer}</div>}
        </div>
      </div>
    </LayerContext>,
    document.body,
  )
}
