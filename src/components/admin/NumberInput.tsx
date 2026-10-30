import { inputClass } from '@/components/ui/styles'
import { NBSP } from '@/lib/format'

type Props = {
  id?: string
  value: number
  onChange: (value: number) => void
  /** o'ngdagi birlik: "so'm", "g", "ml" */
  suffix?: string
  min?: number
  placeholder?: string
}

/** Butun son maydoni: "1 490 000" ko'rinishida guruhlanadi, raqam bo'lmagan belgilar olib tashlanadi. */
export default function NumberInput({ id, value, onChange, suffix, min = 0, placeholder }: Props) {
  const shown = value ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) : ''
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        value={shown}
        placeholder={placeholder ?? '0'}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 12)
          onChange(Math.max(min, Number(digits || 0)))
        }}
        className={`${inputClass} tabular-nums ${suffix ? 'pr-14' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-neutral-400">{suffix}</span>
      )}
    </div>
  )
}
