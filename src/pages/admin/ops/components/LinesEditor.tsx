import { PackageSearch, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import { tdClass, thClass } from '@/components/ui/styles'
import { useDb } from '@/data/db'
import { balanceOf, parseStockKey, stockItemName, stockUnit } from '@/domain/stock'
import type { StockKey } from '@/domain/types'
import { formatMoney } from '@/lib/format'
import { tr } from '@/staff/i18n'
import { NumberInput } from './inputs'
import { STOCK_KIND_SHORT, formatStockQty, stockImage, unitLabel } from './helpers'
import StockPickerModal from './StockPickerModal'

export type DraftLine = { key: StockKey; qty: number; unitCost: number }

type Props = {
  lines: DraftLine[]
  onChange: (lines: DraftLine[]) => void
  /** prixodda kirim narxi kiritiladi; spisanieda — o'rtacha tannarx (o'zgarmaydi) */
  costEditable: boolean
  /** spisanie: qoldiqdan ko'p kiritilsa ogohlantirish */
  warnOverStock?: boolean
}

/** Hujjat qatorlari (prixod, spisanie): pozitsiya · qoldiq · miqdor · 1 birlik narxi · summa. */
export default function LinesEditor({ lines, onChange, costEditable, warnOverStock = false }: Props) {
  const db = useDb()
  const [picking, setPicking] = useState(false)
  const total = lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0)

  const update = (key: StockKey, patch: Partial<DraftLine>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  const add = (key: StockKey) => onChange([...lines, { key, qty: 0, unitCost: balanceOf(db, key).avgCost }])

  return (
    <div className="rounded border border-neutral-200">
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-neutral-500">
          <PackageSearch size={28} className="text-neutral-300" />
          {tr("Hali pozitsiya qo'shilmagan", 'Позиции ещё не добавлены')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className={thClass}>{tr('Pozitsiya', 'Позиция')}</th>
                <th className={`${thClass} text-right`}>{tr('Qoldiq', 'Остаток')}</th>
                <th className={`${thClass} text-right`}>{tr('Miqdor', 'Количество')}</th>
                <th className={`${thClass} text-right`}>{tr('Narx (1 birlik)', 'Цена (за ед.)')}</th>
                <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {lines.map((line) => {
                const balance = balanceOf(db, line.key)
                const over = warnOverStock && line.qty > balance.qty
                return (
                  <tr key={line.key}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2.5">
                        <Img path={stockImage(db, line.key)} alt="" fit="contain" className="bg-photo h-9 w-9 shrink-0 rounded" />
                        <div className="min-w-40 whitespace-normal">
                          <p className="font-medium text-neutral-900">{stockItemName(db, line.key)}</p>
                          <p className="text-xs text-neutral-500">{STOCK_KIND_SHORT[parseStockKey(line.key).kind]}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdClass} text-right text-neutral-500 tabular-nums`}>{formatStockQty(line.key, balance.qty)}</td>
                    <td className={`${tdClass} w-36`}>
                      <NumberInput
                        ariaLabel={tr('Miqdor', 'Количество')}
                        value={line.qty}
                        onChange={(qty) => update(line.key, { qty })}
                        suffix={unitLabel(stockUnit(line.key))}
                        className={over ? '[&_input]:border-red-700' : ''}
                      />
                      {over && <p className="mt-0.5 text-right text-[11px] text-red-700">{tr("Qoldiqdan ko'p", 'Больше остатка')}</p>}
                    </td>
                    <td className={`${tdClass} w-40 text-right tabular-nums`}>
                      {costEditable ? (
                        <NumberInput ariaLabel={tr('Narx', 'Цена')} value={line.unitCost} onChange={(unitCost) => update(line.key, { unitCost })} suffix={tr("so'm", 'сум')} />
                      ) : (
                        formatMoney(line.unitCost)
                      )}
                    </td>
                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(line.qty * line.unitCost)}</td>
                    <td className={`${tdClass} w-10`}>
                      <IconButton label={tr('Olib tashlash', 'Убрать')} tone="danger" onClick={() => onChange(lines.filter((item) => item.key !== line.key))}>
                        <Trash2 size={15} />
                      </IconButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2.5">
        <button type="button" onClick={() => setPicking(true)} className="btn-outline flex h-9 items-center gap-1.5 rounded px-3 text-sm font-semibold">
          <Plus size={16} />
          {tr("Pozitsiya qo'shish", 'Добавить позицию')}
        </button>
        <p className="text-sm text-neutral-600">
          {tr('Jami', 'Итого')}: <span className="font-bold text-neutral-900 tabular-nums">{formatMoney(total)}</span>
        </p>
      </div>
      {picking && <StockPickerModal selected={lines.map((line) => line.key)} onPick={add} onClose={() => setPicking(false)} />}
    </div>
  )
}
