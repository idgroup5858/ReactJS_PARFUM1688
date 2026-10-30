import { Check } from 'lucide-react'
import { useState } from 'react'
import Sheet from '@/customer/components/Sheet'
import { useT } from '@/customer/i18n'

export type Option = { value: string; label: string; hint?: string }

type Props = {
  title: string
  options: Option[]
  value: string | null
  onSelect: (value: string | null) => void
  onClose: () => void
  /** "Все" qatori (tanlovni olib tashlash); saralashda yo'q */
  allowAll?: boolean
  /** uzun ro'yxat uchun qidiruv (brendlar) */
  searchPlaceholder?: string
}

/** Bitta qiymat tanlanadigan ro'yxat (kategoriya, jins, brend, saralash). Tanlash bilan yopiladi. */
export default function OptionSheet({ title, options, value, onSelect, onClose, allowAll = true, searchPlaceholder }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options
  const rows: Option[] = allowAll && !needle ? [{ value: '', label: t.common.all }, ...visible] : visible

  return (
    <Sheet title={title} onClose={onClose} closeLabel={t.common.close}>
      {searchPlaceholder && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 h-11 w-full rounded border border-neutral-200 bg-white px-3 text-sm"
        />
      )}
      <div className="divide-y divide-neutral-100">
        {rows.map((option) => {
          const active = (value ?? '') === option.value
          return (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => {
                onSelect(option.value || null)
                onClose()
              }}
              className={`flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left text-[15px] transition-colors hover:bg-neutral-50 ${active ? 'font-semibold text-brand-700' : 'text-neutral-800'}`}
            >
              <span className="min-w-0 flex-1">
                {option.label}
                {option.hint && <span className="ml-2 text-xs font-normal text-neutral-400">{option.hint}</span>}
              </span>
              {active && <Check size={18} className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
