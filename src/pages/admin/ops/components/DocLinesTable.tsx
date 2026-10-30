import Img from '@/components/ui/Img'
import { tdClass, thClass } from '@/components/ui/styles'
import { useDb } from '@/data/db'
import { parseStockKey, stockItemName } from '@/domain/stock'
import type { StockKey } from '@/domain/types'
import { formatMoney } from '@/lib/format'
import { tr } from '@/staff/i18n'
import { STOCK_KIND_SHORT, formatStockQty, stockImage } from './helpers'

/** Saqlangan hujjat qatorlari (prixod, spisanie) — faqat ko'rish uchun. */
export default function DocLinesTable({ lines }: { lines: { key: StockKey; qty: number; unitCost: number }[] }) {
  const db = useDb()
  return (
    <div className="overflow-x-auto rounded border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            <th className={thClass}>{tr('Pozitsiya', 'Позиция')}</th>
            <th className={`${thClass} text-right`}>{tr('Miqdor', 'Количество')}</th>
            <th className={`${thClass} text-right`}>{tr('Narx (1 birlik)', 'Цена (за ед.)')}</th>
            <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {lines.map((line) => (
            <tr key={line.key}>
              <td className={tdClass}>
                <div className="flex items-center gap-2.5">
                  <Img path={stockImage(db, line.key)} alt="" fit="contain" className="bg-photo h-9 w-9 shrink-0 rounded" />
                  {/* nom sig'masa ikki qatorga o'tadi — "Summa" ustuni oyna (lg) ichida ko'rinib tursin */}
                  <div className="min-w-40 whitespace-normal">
                    <p className="font-medium text-neutral-900">{stockItemName(db, line.key)}</p>
                    <p className="text-xs text-neutral-500">{STOCK_KIND_SHORT[parseStockKey(line.key).kind]}</p>
                  </div>
                </div>
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>{formatStockQty(line.key, line.qty)}</td>
              <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(line.unitCost)}</td>
              <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(line.qty * line.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
