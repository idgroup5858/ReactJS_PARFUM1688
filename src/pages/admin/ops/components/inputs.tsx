import { inputClass } from '@/components/ui/styles'
import { formatNumber } from '@/lib/format'

type CommonProps = {
  id?: string
  className?: string
  /** maydon ichida o'ngda: "so'm", "g", "dona" */
  suffix?: string
  disabled?: boolean
  ariaLabel?: string
  autoFocus?: boolean
}

type Props = CommonProps &
  (
    | { allowEmpty?: false; value: number; onChange: (value: number) => void }
    /**
     * Bo'sh qoldirish mumkin (inventarizatsiyada "sanalmagan"): bo'sh maydon — `undefined`, 0 — haqiqiy nol.
     * Nol qiymat qora "0" bo'lib ko'rinadi, bo'sh maydonda esa kulrang "—".
     */
    | { allowEmpty: true; value: number | undefined; onChange: (value: number | undefined) => void }
  )

const digitsOf = (text: string) => text.replace(/\D/g, '')

/** Butun son maydoni: yozganda guruhlab ko'rsatadi ("1 250 000"), faqat raqam qabul qiladi. */
export function NumberInput(props: Props) {
  const { id, className = '', suffix, disabled, ariaLabel, autoFocus } = props
  const text = props.allowEmpty ? (props.value === undefined ? '' : formatNumber(props.value)) : props.value === 0 ? '' : formatNumber(props.value)

  const change = (raw: string) => {
    const digits = digitsOf(raw)
    if (props.allowEmpty) props.onChange(digits === '' ? undefined : Number(digits))
    else props.onChange(Number(digits) || 0)
  }

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        disabled={disabled}
        value={text}
        placeholder={props.allowEmpty ? '—' : '0'}
        onChange={(event) => change(event.target.value)}
        onFocus={(event) => event.target.select()}
        className={`${inputClass} text-right tabular-nums ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">{suffix}</span>
      )}
    </div>
  )
}
