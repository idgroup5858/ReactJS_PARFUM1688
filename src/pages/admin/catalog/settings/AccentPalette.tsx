import { Check } from 'lucide-react'
import { tr } from '@/staff/i18n'
import { ACCENTS, DEFAULT_ACCENT_ID } from '@/theme/accents'
import { useIsDark } from '@/theme/useIsDark'

type Props = {
  value: string
  onChange: (accentId: string) => void
  label: string
}

/**
 * 16 rangli palitra (ReactJS_Language AccentCard ko'rinishi). Ustunlar soni ekranga emas, palitraning o'z kengligiga
 * qarab (container query): ikki karta yonma-yon turganda 8 ustunda "Siyohrang", "To'q sariq" kabi nomlar sig'mas edi.
 */
export default function AccentPalette({ value, onChange, label }: Props) {
  const dark = useIsDark()
  return (
    <div className="@container">
      <div className="grid grid-cols-4 gap-1.5 p-4 @2xl:grid-cols-8" role="radiogroup" aria-label={label}>
        {ACCENTS.map((accent) => {
          const active = value === accent.id
          const name = tr(accent.name, accent.nameRu)
          return (
            <button
              key={accent.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={accent.id === DEFAULT_ACCENT_ID ? `${name} (${tr('standart', 'по умолчанию')})` : name}
              onClick={() => onChange(accent.id)}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded border px-1 py-2 transition-colors ${active ? 'border-brand-700 bg-brand-50' : 'border-transparent hover:bg-neutral-50'}`}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white ring-1 ring-black/10 ring-inset dark:ring-white/15"
                style={{ backgroundColor: dark ? (accent.fillDark ?? accent.color) : accent.color }}
              >
                {active && <Check size={15} strokeWidth={3} />}
              </span>
              {/* nom qisqartirilmaydi (…) — sig'masa ikkinchi qatorga o'tadi */}
              <span className={`w-full text-center text-[11px] leading-tight ${active ? 'font-semibold text-brand-700' : 'text-neutral-600'}`}>{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
