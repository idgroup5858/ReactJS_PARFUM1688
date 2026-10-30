import type { Bar } from '@/domain/presets'
import { loc } from '@/staff/i18n'

type Colors = string | ((bar: Bar) => string)

const colorOf = (colors: Colors, bar: Bar) => (typeof colors === 'string' ? colors : colors(bar))

/** Radio-kartadagi kichik vertikal ustunlar: tanlov qanday chiziqlar berishini bir qarashda ko'rsatadi. */
export function MiniBars({ bars, colors }: { bars: Bar[]; colors: Colors }) {
  return (
    <span className="flex h-8 shrink-0 items-end gap-[3px]" aria-hidden="true">
      {bars.map((bar) => (
        <span key={bar.id} className="w-2 rounded-t-[2px]" style={{ height: `${Math.max(8, bar.value)}%`, backgroundColor: colorOf(colors, bar) }} />
      ))}
    </span>
  )
}

/** Mijoz ilovasidagi kabi chiziqlar: nomi · chiziq · foiz (xodim tilidagi yorliqlar). */
export function BarsPreview({ bars, colors, digits = 0 }: { bars: Bar[]; colors: Colors; digits?: number }) {
  return (
    <div className="space-y-1.5">
      {bars.map((bar) => (
        <div key={bar.id} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
          <span className="truncate text-neutral-600">{loc(bar.label)}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <span className="block h-full rounded-full" style={{ width: `${bar.value}%`, backgroundColor: colorOf(colors, bar) }} />
          </span>
          <span className="text-right font-semibold text-neutral-700 tabular-nums">{bar.value.toFixed(digits).replace('.', ',')}%</span>
        </div>
      ))}
    </div>
  )
}
