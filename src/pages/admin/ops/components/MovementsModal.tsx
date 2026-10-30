import { useMemo } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import { MOVEMENT_REASON_LABEL } from '@/domain/labels'
import { balanceOf, stockItemName } from '@/domain/stock'
import type { StockKey } from '@/domain/types'
import { formatDateTime, formatMoney } from '@/lib/format'
import { ruPlural, tr } from '@/staff/i18n'
import { History } from 'lucide-react'
import { docLabel, formatStockQty, userName } from './helpers'

/** Pozitsiya harakatlari: kirim (+) va chiqim (−), sabab, tannarx, hujjat — eng yangisi tepada. */
export default function MovementsModal({ stockKey, onClose }: { stockKey: StockKey; onClose: () => void }) {
  const db = useDb()
  const movements = useMemo(
    () => db.movements.filter((movement) => movement.key === stockKey).sort((a, b) => b.at.localeCompare(a.at)),
    [db, stockKey],
  )
  const { pageItems, pagination } = usePagination(movements, stockKey)
  const balance = balanceOf(db, stockKey)

  return (
    <Modal title={tr('Harakatlar tarixi', 'История движений')} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-900">{stockItemName(db, stockKey)}</p>
            <p className="text-xs text-neutral-500">{tr(`${movements.length} ta harakat`, `${movements.length} ${ruPlural(movements.length, 'движение', 'движения', 'движений')}`)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{tr('Hozirgi qoldiq', 'Текущий остаток')}</p>
            <p className="text-lg font-semibold text-neutral-900">{formatStockQty(stockKey, balance.qty)}</p>
          </div>
        </div>
        {movements.length === 0 ? (
          <EmptyState icon={History} title={tr("Harakat yo'q", 'Движений нет')} />
        ) : (
          <div className="rounded border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={thClass}>{tr('Sabab', 'Причина')}</th>
                    <th className={`${thClass} text-right`}>{tr('Miqdor', 'Количество')}</th>
                    <th className={`${thClass} text-right`}>{tr('Tannarx', 'Себестоимость')}</th>
                    <th className={thClass}>{tr('Hujjat', 'Документ')}</th>
                    <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((movement) => (
                    <tr key={movement.id}>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDateTime(movement.at)}</td>
                      <td className={tdClass}>{MOVEMENT_REASON_LABEL[movement.reason]}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums ${movement.qty > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {movement.qty > 0 ? '+' : '−'}
                        {formatStockQty(stockKey, Math.abs(movement.qty))}
                      </td>
                      <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(movement.unitCost)}</td>
                      <td className={`${tdClass} font-mono text-xs text-neutral-600`}>{docLabel(db, movement.refId) ?? '—'}</td>
                      <td className={`${tdClass} text-neutral-600`}>{userName(db, movement.userId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </div>
        )}
      </div>
    </Modal>
  )
}
