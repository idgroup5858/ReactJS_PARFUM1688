import type { ReactNode } from 'react'

export type SegmentOption<T extends string> = {
  value: T
  label: ReactNode
  /** tooltip va ekran o'quvchi uchun nom — yorliqda faqat ikonka qolganda kerak */
  title?: string
}

type Props<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Segmentli tanlov: kulrang yo'lak ichida faol variant oq bo'lib turadi. */
export default function SegmentedControl<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-9 max-w-full items-center gap-1 overflow-x-auto rounded bg-neutral-200/70 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            aria-label={option.title}
            onClick={() => onChange(option.value)}
            className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-semibold whitespace-nowrap transition-colors ${active ? 'bg-white text-brand-700' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
