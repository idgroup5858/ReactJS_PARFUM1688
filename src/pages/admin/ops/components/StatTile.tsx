import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNumber } from '@/lib/format'
import { tr } from '@/staff/i18n'

type Props = {
  label: string
  value: ReactNode
  /** qisqartirilgan qiymatning to'liq ko'rinishi (maslahat) */
  fullValue?: string
  hint?: ReactNode
  /** oldingi davrga nisbatan, % (null — solishtirib bo'lmaydi) */
  delta?: number | null
  /** o'sish yaxshimi (savdo — ha, chiqim — yo'q) */
  upIsGood?: boolean
  /** manfiy natija (masalan, sof foyda < 0) */
  negative?: boolean
}

/**
 * Ko'rsatkich kartochkasi (dataviz "stat tile"): yorliq · qiymat (oddiy raqamlar, tabular emas) · o'zgarish.
 * O'zgarish rangi yo'nalish × yaxshi/yomon, doim belgi va matn bilan (faqat rangga tayanmaydi).
 * Qiymat o'lchami kartochka kengligiga qarab (container query): telefonda 2 ustunli to'rda ham "197,7 mln so'm" sig'adi.
 */
export default function StatTile({ label, value, fullValue, hint, delta, upIsGood = true, negative = false }: Props) {
  const showDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const flat = showDelta && Math.abs(delta) < 0.5
  const good = showDelta && !flat && (delta > 0) === upIsGood
  const Icon = !showDelta || flat ? Minus : delta > 0 ? TrendingUp : TrendingDown

  return (
    <div className="@container flex min-w-0 flex-col gap-1 rounded border border-neutral-200 bg-white px-4 py-3.5">
      <p className="truncate text-xs font-medium text-neutral-500">{label}</p>
      <p
        title={fullValue ?? (typeof value === 'string' ? value : undefined)}
        className={`truncate text-lg font-semibold tracking-tight @[10rem]:text-xl @[12rem]:text-2xl ${negative ? 'text-red-700' : 'text-neutral-900'}`}
      >
        {value}
      </p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {showDelta && (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${flat ? 'text-neutral-500' : good ? 'text-emerald-700' : 'text-red-700'}`}
            title={tr('Oldingi teng davrga nisbatan', 'По сравнению с предыдущим таким же периодом')}
          >
            <Icon size={13} />
            {delta > 0 ? '+' : ''}
            {formatNumber(delta, 1)}%
          </span>
        )}
        {hint && <span className="truncate text-neutral-500">{hint}</span>}
      </div>
    </div>
  )
}
