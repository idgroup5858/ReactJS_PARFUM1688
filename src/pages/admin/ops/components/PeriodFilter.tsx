import SegmentedControl from '@/components/ui/SegmentedControl'
import { tr } from '@/staff/i18n'
import { filterDateClass } from './helpers'
import { PERIOD_LABEL, makePeriod, type Period, type PeriodPreset } from './period'

type Props = {
  value: Period
  onChange: (period: Period) => void
  /** "Hammasi" varianti (ro'yxatlar uchun; dashboard'da yo'q) */
  allowAll?: boolean
}

/**
 * Davr tanlovi: Bugun · 7 kun · 30 kun · Bu oy · (Hammasi) · Oraliq — oraliqda ikkita sana maydoni chiqadi.
 * Tor ekranda (telefon) tanlov ekran kengligidan chiqmaydi — o'z ichida yon tomonga suriladi.
 */
export default function PeriodFilter({ value, onChange, allowAll = false }: Props) {
  const presets: PeriodPreset[] = ['today', '7d', '30d', 'month', ...(allowAll ? (['all'] as const) : []), 'custom']
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <SegmentedControl
        label={tr('Davr', 'Период')}
        value={value.preset}
        onChange={(preset) => onChange(makePeriod(preset, value))}
        options={presets.map((preset) => ({ value: preset, label: PERIOD_LABEL[preset] }))}
      />
      {value.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label={tr('Boshlanish sanasi', 'Дата начала')}
            value={value.from}
            max={value.to}
            onChange={(event) => event.target.value && onChange({ ...value, from: event.target.value })}
            className={filterDateClass}
          />
          <span className="text-neutral-400">—</span>
          <input
            type="date"
            aria-label={tr('Tugash sanasi', 'Дата окончания')}
            value={value.to}
            min={value.from}
            onChange={(event) => event.target.value && onChange({ ...value, to: event.target.value })}
            className={filterDateClass}
          />
        </div>
      )}
    </div>
  )
}
