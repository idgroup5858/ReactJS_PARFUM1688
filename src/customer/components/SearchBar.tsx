import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'

type Props = {
  /**
   * Berilsa — maydon tashqaridan boshqariladi (katalog: matn sahifada saqlanadi, "Сбросить" uni ham tozalaydi).
   * Berilmasa (bosh sahifa) — o'z holati bilan ishlaydi.
   */
  value?: string
  /** Enter / "Найти" bosilganda */
  onSubmit: (query: string) => void
  /** har harfda (katalogda darhol filtrlash uchun) */
  onChange?: (query: string) => void
}

/** Qidiruv maydoni (namunadagidek, kamera belgisisiz): chapda lupa, o'ngda tozalash. */
export default function SearchBar({ value: controlled, onSubmit, onChange }: Props) {
  const t = useT()
  const [own, setOwn] = useState('')
  const value = controlled ?? own
  const update = (next: string) => {
    if (controlled === undefined) setOwn(next)
    onChange?.(next)
  }
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value.trim())
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400" size={19} />
      <input
        type="search"
        value={value}
        onChange={(event) => update(event.target.value)}
        placeholder={t.common.searchPlaceholder}
        aria-label={t.common.searchPlaceholder}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        className="h-12 w-full rounded border border-neutral-200 bg-white pr-11 pl-11 text-[15px] text-neutral-900 transition-colors hover:border-neutral-300"
      />
      {value && (
        <button
          type="button"
          onClick={() => update('')}
          aria-label={t.catalog.reset}
          className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X size={17} />
        </button>
      )}
    </form>
  )
}
