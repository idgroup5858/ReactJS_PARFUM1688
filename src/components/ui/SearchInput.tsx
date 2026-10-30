import { Search, X } from 'lucide-react'
import type { Ref } from 'react'
import { tr } from '@/staff/i18n'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputId?: string
  autoFocus?: boolean
  ref?: Ref<HTMLInputElement>
}

/** Qidiruv maydoni: chapda lupa, o'ngda tozalash tugmasi. */
export default function SearchInput({ value, onChange, placeholder, inputId, autoFocus, ref }: Props) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400" size={16} />
      <input
        ref={ref}
        id={inputId}
        type="search"
        aria-label={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        enterKeyHint="search"
        className="h-9 w-full rounded border border-neutral-300 bg-white pr-10 pl-10 text-sm text-neutral-900 transition-colors hover:border-neutral-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={tr('Tozalash', 'Очистить')}
          title={tr('Tozalash', 'Очистить')}
          className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
