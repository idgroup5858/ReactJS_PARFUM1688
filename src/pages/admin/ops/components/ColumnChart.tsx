import { useState } from 'react'
import { formatCompact } from '@/lib/format'
import { VIZ_ROOT, axisTicks } from './viz'

export type Column = {
  key: string
  /** o'q ostidagi qisqa yozuv ("12.10", "14:00") */
  axisLabel: string
  /** maslahat oynasidagi to'liq yozuv ("12.10.2026, dushanba") */
  label: string
  value: number
  /** maslahat oynasidagi qiymat matni */
  valueLabel: string
  /** maslahatdagi qo'shimcha qator ("8 ta buyurtma") */
  sub?: string
}

const PLOT_HEIGHT = 180

/**
 * Ustunli grafik (bitta ko'rsatkich, vaqt bo'yicha). Ustun ≤24px, yuqori uchi 4px yumaloq, asosda to'g'ri; ingichka
 * yordamchi chiziqlar; har ustun — fokuslanadigan tugma, ustiga kelganda maslahat (qiymat yo'g'on, sana ostida).
 * Qiymatlarning jadval ko'rinishi sahifada alohida (Grafik / Jadval).
 */
export default function ColumnChart({ columns }: { columns: Column[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...columns.map((column) => column.value), 0)
  const ticks = axisTicks(max || 1)
  const top = ticks[ticks.length - 1]
  // o'q yozuvlari bir-biriga tegmasin: ~10 tadan ko'p bo'lsa har n-chisi
  const labelEvery = Math.max(1, Math.ceil(columns.length / 10))
  const current = active === null ? null : columns[active]

  return (
    <div className={`flex gap-2 px-4 pt-4 pb-3 ${VIZ_ROOT}`}>
      {/* Y o'qi */}
      <div className="relative w-12 shrink-0 text-right text-[10px] text-neutral-400 tabular-nums" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: PLOT_HEIGHT - (tick / top) * PLOT_HEIGHT }}>
            {formatCompact(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: PLOT_HEIGHT }} onMouseLeave={() => setActive(null)}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className={`absolute inset-x-0 border-t ${tick === 0 ? 'border-neutral-300' : 'border-neutral-100'}`}
              style={{ top: PLOT_HEIGHT - (tick / top) * PLOT_HEIGHT }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {columns.map((column, index) => (
              <button
                key={column.key}
                type="button"
                aria-label={`${column.label}: ${column.valueLabel}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
              >
                <span
                  className={`block w-full max-w-6 rounded-t-[4px] bg-(--viz-mark) transition-opacity ${active !== null && active !== index ? 'opacity-45' : ''}`}
                  style={{ height: column.value > 0 ? Math.max(2, (column.value / top) * PLOT_HEIGHT) : 0 }}
                />
              </button>
            ))}
          </div>

          {current && active !== null && (
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-36 -translate-x-1/2 rounded border border-neutral-200 bg-white px-3 py-2 shadow-lg"
              style={{ left: `${Math.min(85, Math.max(15, ((active + 0.5) / columns.length) * 100))}%` }}
            >
              <p className="text-sm font-bold whitespace-nowrap text-neutral-900">{current.valueLabel}</p>
              <p className="text-xs whitespace-nowrap text-neutral-500">{current.label}</p>
              {current.sub && <p className="text-xs whitespace-nowrap text-neutral-500">{current.sub}</p>}
            </div>
          )}
        </div>

        {/* X o'qi */}
        <div className="mt-1.5 flex gap-0.5">
          {columns.map((column, index) => (
            <span key={column.key} className="min-w-0 flex-1 overflow-visible text-center text-[10px] whitespace-nowrap text-neutral-400 tabular-nums">
              {index % labelEvery === 0 ? column.axisLabel : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
