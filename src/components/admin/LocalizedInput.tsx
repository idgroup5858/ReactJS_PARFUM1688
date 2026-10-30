import type { Lang, Localized } from '@/domain/types'
import { inputClass, labelClass, textareaClass } from '@/components/ui/styles'

type Props = {
  label: string
  value: Localized
  onChange: (value: Localized) => void
  multiline?: boolean
  rows?: number
  placeholder?: Partial<Localized>
  /** maydon id lari prefiksi (yorliq bilan bog'lash uchun) */
  id: string
}

const LANGS: { id: Lang; name: string }[] = [
  { id: 'ru', name: 'RU' },
  { id: 'uz', name: 'UZ' },
]

/** Mijoz ilovasidagi ikki tilli matn: ruscha va o'zbekcha maydon yonma-yon (telefonda ustma-ust). */
export default function LocalizedInput({ label, value, onChange, multiline = false, rows = 3, placeholder, id }: Props) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LANGS.map((lang) => (
          <div key={lang.id} className="relative">
            <span className="pointer-events-none absolute top-2 right-2 rounded bg-neutral-100 px-1.5 py-px text-[10px] font-bold tracking-wider text-neutral-500">
              {lang.name}
            </span>
            {multiline ? (
              <textarea
                id={`${id}-${lang.id}`}
                rows={rows}
                value={value[lang.id]}
                placeholder={placeholder?.[lang.id]}
                onChange={(event) => onChange({ ...value, [lang.id]: event.target.value })}
                className={`${textareaClass} pr-10`}
              />
            ) : (
              <input
                id={`${id}-${lang.id}`}
                value={value[lang.id]}
                placeholder={placeholder?.[lang.id]}
                onChange={(event) => onChange({ ...value, [lang.id]: event.target.value })}
                className={`${inputClass} pr-10`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
