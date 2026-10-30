import { useState } from 'react'
import Sheet from '@/customer/components/Sheet'
import { useT } from '@/customer/i18n'

type Props = {
  min: number | null
  max: number | null
  onApply: (min: number | null, max: number | null) => void
  onClose: () => void
}

const toNumber = (text: string) => {
  const digits = text.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

/** Narx oralig'i (1 gramm narxi bo'yicha). */
export default function PriceSheet({ min, max, onApply, onClose }: Props) {
  const t = useT()
  const [from, setFrom] = useState(min === null ? '' : String(min))
  const [to, setTo] = useState(max === null ? '' : String(max))
  const inputClass = 'h-12 w-full rounded border border-neutral-200 bg-white px-3 text-[15px] tabular-nums'

  return (
    <Sheet
      title={t.catalog.price}
      subtitle={t.catalog.pricePerGram}
      onClose={onClose}
      closeLabel={t.common.close}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              onApply(null, null)
              onClose()
            }}
            className="btn-ghost h-12 flex-1 rounded text-sm font-semibold"
          >
            {t.catalog.reset}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(toNumber(from), toNumber(to))
              onClose()
            }}
            className="btn-primary h-12 flex-1 rounded text-sm font-semibold"
          >
            {t.catalog.apply}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">{t.catalog.priceMin}</span>
          <input value={from} onChange={(event) => setFrom(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">{t.catalog.priceMax}</span>
          <input value={to} onChange={(event) => setTo(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </label>
      </div>
    </Sheet>
  )
}
