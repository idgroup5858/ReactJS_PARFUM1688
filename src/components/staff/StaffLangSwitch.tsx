import type { Lang } from '@/domain/types'
import { tr, useStaffLang } from '@/staff/i18n'
import { setStaffLang } from '@/store/settingsStore'

const LANGS: Lang[] = ['uz', 'ru']

/** Kassa va admin tili (UZ / RU) — shu qurilmada saqlanadi. Mijoz ilovasidagi almashtirgich ko'rinishida. */
export default function StaffLangSwitch() {
  const lang = useStaffLang()
  return (
    <div role="radiogroup" aria-label={tr('Til', 'Язык')} className="flex shrink-0 items-center rounded border border-neutral-200 p-0.5">
      {LANGS.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={lang === item}
          onClick={() => setStaffLang(item)}
          className={`h-7 cursor-pointer rounded-sm px-2 text-[11px] font-bold tracking-wider uppercase transition-colors ${lang === item ? 'bg-brand-fill text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
