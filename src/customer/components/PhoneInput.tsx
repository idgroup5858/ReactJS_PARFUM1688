type Props = {
  /** faqat raqamlar, 998 bilan: "998901234567" (yoki bo'sh) */
  value: string
  onChange: (digits: string) => void
  label: string
  invalid?: boolean
}

/** 9 ta raqamni "90 123 45 67" ko'rinishida guruhlaydi. */
function group(rest: string): string {
  const parts = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(Boolean)
  return parts.join(' ')
}

/**
 * Kiritilgan matndan 9 ta milliy raqam. To'liq xalqaro raqam ("+998 90 777 66 55" — brauzer avtomatik to'ldirsa)
 * kelsa, davlat kodi tashlanadi — aks holda "998907776" qolib, noto'g'ri raqam saqlanardi.
 */
function nationalDigits(text: string): string {
  const digits = text.replace(/\D/g, '')
  return (digits.length >= 12 && digits.startsWith('998') ? digits.slice(3) : digits).slice(0, 9)
}

/** O'zbekiston raqami: "+998" doimiy, qolgan 9 raqam niqob bilan. */
export default function PhoneInput({ value, onChange, label, invalid = false }: Props) {
  const rest = value.startsWith('998') ? value.slice(3) : value
  const emit = (digits: string) => onChange(digits ? `998${digits}` : '')
  return (
    <label
      className={`flex h-12 items-center gap-2 rounded border bg-white px-3 focus-within:border-brand-700 ${invalid ? 'border-red-400' : 'border-neutral-200'}`}
    >
      <span className="text-[15px] font-medium text-neutral-500">+998</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        aria-label={label}
        placeholder="90 123 45 67"
        value={group(rest)}
        onChange={(event) => emit(nationalDigits(event.target.value))}
        onPaste={(event) => {
          // to'liq raqam yopishtirilsa (Telegram, kontaktlardan) — maydondagi eski raqam bilan qo'shilib ketmasin
          const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
          if (pasted.length < 9) return
          event.preventDefault()
          emit(nationalDigits(pasted))
        }}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-neutral-900 tabular-nums"
      />
    </label>
  )
}
