import { useDb } from '@/data/db'
import { balanceOf, stockKey } from '@/domain/stock'
import type { ID } from '@/domain/types'
import { selectClass } from '@/components/ui/styles'
import { formatMoney, formatNumber } from '@/lib/format'
import { tr } from '@/staff/i18n'

export type FlakonPick = { flakonId?: ID; paid: boolean }

type Props = {
  value: FlakonPick
  onChange: (value: FlakonPick) => void
  /** shu grammga mos kelmaydigan (kichik) tara ogohlantiriladi */
  grams: number
}

/** Razliv qatori uchun tara: faol flakonlardan biri + Tekin / Pullik (narx flakon kartochkasidan). */
export default function FlakonPicker({ value, onChange, grams }: Props) {
  const db = useDb()
  const flakons = db.flakons.filter((flakon) => flakon.active || flakon.id === value.flakonId).sort((a, b) => a.volumeMl - b.volumeMl)
  const selected = flakons.find((flakon) => flakon.id === value.flakonId)
  const stock = selected ? balanceOf(db, stockKey('flakon', selected.id)).qty : 0

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <select
          value={value.flakonId ?? ''}
          onChange={(event) => onChange({ ...value, flakonId: event.target.value || undefined })}
          aria-label={tr('Flakon', 'Флакон')}
          className={`${selectClass} min-w-0 flex-1 basis-48 ${value.flakonId ? '' : 'border-amber-500'}`}
        >
          <option value="">{tr('— Flakon tanlang —', '— Выберите флакон —')}</option>
          {flakons.map((flakon) => (
            <option key={flakon.id} value={flakon.id}>
              {flakon.name} · {tr('qoldiq', 'остаток')} {formatNumber(balanceOf(db, stockKey('flakon', flakon.id)).qty)}
            </option>
          ))}
        </select>
        <div className="inline-flex h-10 shrink-0 items-center gap-1 rounded bg-neutral-200/70 p-1" role="radiogroup" aria-label={tr('Flakon narxi', 'Цена флакона')}>
          {[
            { paid: false, label: tr('Tekin', 'Бесплатно') },
            { paid: true, label: selected ? `${tr('Pullik', 'Платный')} · ${formatMoney(selected.price)}` : tr('Pullik', 'Платный') },
          ].map((option) => (
            <button
              key={String(option.paid)}
              type="button"
              role="radio"
              aria-checked={value.paid === option.paid}
              onClick={() => onChange({ ...value, paid: option.paid })}
              className={`flex h-8 cursor-pointer items-center rounded px-3 text-xs font-semibold whitespace-nowrap transition-colors ${value.paid === option.paid ? 'bg-white text-brand-700' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {selected && selected.volumeMl < grams && (
        <p className="text-xs font-medium text-amber-700">
          {tr(`${selected.name} — ${formatNumber(grams)} g ga kichik`, `${selected.name} — мал для ${formatNumber(grams)} г`)}
        </p>
      )}
      {selected && stock < 1 && <p className="text-xs font-medium text-red-700">{tr('Bu flakon omborda qolmagan', 'Этого флакона нет на складе')}</p>}
    </div>
  )
}
