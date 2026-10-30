import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import IconButton from '@/components/ui/IconButton'
import { accordWidth, readableTextColor } from '@/domain/presets'
import type { Accord, ID } from '@/domain/types'
import { loc, tr } from '@/staff/i18n'

type Props = {
  value: ID[]
  accords: Accord[]
  onChange: (value: ID[]) => void
}

/**
 * Asosiy akkordlar: tartib muhim — birinchisi eng kuchli (eng uzun chiziq). Chiziqlar mijoz sahifasidagidek
 * ko'rinadi; yuqoriga / pastga surish, olib tashlash, pastdagi rangli chiplardan qo'shish.
 */
export default function AccordsEditor({ value, accords, onChange }: Props) {
  const byId = useMemo(() => new Map(accords.map((accord) => [accord.id, accord])), [accords])
  const remaining = accords.filter((accord) => !value.includes(accord.id))

  const move = (index: number, delta: number) => {
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  return (
    <Card>
      <CardHeader
        title={tr('Asosiy akkordlar', 'Основные аккорды')}
        hint={tr('Kuchlisidan boshlab tartiblang — chiziq uzunligi tartibdan', 'Расставьте от самого сильного — длина полосы зависит от порядка')}
      />
      <div className="space-y-4 p-4">
        {value.length === 0 ? (
          <p className="text-xs text-neutral-400">{tr("Akkord tanlanmagan — pastdan qo'shing", 'Аккорды не выбраны — добавьте снизу')}</p>
        ) : (
          <ol className="space-y-1.5">
            {value.map((id, index) => {
              const accord = byId.get(id)
              const color = accord?.color ?? '#999999'
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-xs font-semibold text-neutral-400 tabular-nums">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="flex h-7 items-center justify-center truncate rounded px-2 text-xs font-semibold"
                      style={{ width: `${accordWidth(index)}%`, backgroundColor: color, color: readableTextColor(color) }}
                    >
                      {accord ? loc(accord.name) : id}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label={tr('Yuqoriga', 'Вверх')} onClick={() => index > 0 && move(index, -1)}>
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton label={tr('Pastga', 'Вниз')} onClick={() => index < value.length - 1 && move(index, 1)}>
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton label={tr('Olib tashlash', 'Убрать')} tone="danger" onClick={() => onChange(value.filter((item) => item !== id))}>
                      <X size={14} />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {remaining.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{tr("Qo'shish", 'Добавить')}</p>
            <div className="flex flex-wrap gap-1.5">
              {remaining.map((accord) => (
                <button
                  key={accord.id}
                  type="button"
                  onClick={() => onChange([...value, accord.id])}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 transition-colors hover:border-neutral-400"
                >
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: accord.color }} />
                  {loc(accord.name)}
                  <Plus size={12} className="text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
