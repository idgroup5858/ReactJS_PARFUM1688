import type { ReactNode } from 'react'

const TONES = {
  brand: 'border-brand-200 bg-brand-50 text-brand-700',
  neutral: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

/** Kichik holat belgisi: "YANGI", "NOFAOL", "ADMIN"... */
export default function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${TONES[tone]}`}>
      {children}
    </span>
  )
}
