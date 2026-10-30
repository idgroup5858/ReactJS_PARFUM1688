import type { ReactNode } from 'react'
import { tr } from '@/staff/i18n'
import { VIZ_ROOT } from './viz'

export type BarRow = {
  id: string
  label: ReactNode
  value: number
  /** chiziq o'ngidagi qiymat matni */
  valueLabel: string
  /** ostidagi qo'shimcha matn (gramm, soni, ulush...) */
  sub?: ReactNode
  /** sichqoncha / fokusda to'liq yozuv */
  title?: string
}

type Props = {
  rows: BarRow[]
  empty?: string
}

/**
 * Gorizontal chiziqlar ro'yxati — bitta ko'rsatkich (bitta rang) toifalar bo'yicha. Har bir qiymat matn bilan
 * yozilgan (jadval o'rnini bosadi), chiziq faqat nisbatni ko'rsatadi: 8px qalinlik, uchi 4px yumaloq.
 */
export default function BarList({ rows, empty = tr("Ma'lumot yo'q", 'Нет данных') }: Props) {
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-sm text-neutral-400">{empty}</p>
  const max = Math.max(...rows.map((row) => row.value), 0)
  return (
    <ul className={`space-y-3 px-4 py-4 ${VIZ_ROOT}`}>
      {rows.map((row) => (
        <li key={row.id} title={row.title} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-neutral-800">{row.label}</span>
            <span className="shrink-0 font-semibold text-neutral-900 tabular-nums">{row.valueLabel}</span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-r-[4px] bg-neutral-100">
            <div
              className="h-2 rounded-r-[4px] bg-(--viz-mark) transition-opacity group-hover:opacity-80"
              style={{ width: `${max > 0 ? Math.max(1, (row.value / max) * 100) : 0}%` }}
            />
          </div>
          {row.sub && <p className="mt-1 text-xs text-neutral-500">{row.sub}</p>}
        </li>
      ))}
    </ul>
  )
}
