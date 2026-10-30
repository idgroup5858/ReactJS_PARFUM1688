import { Eye, PackagePlus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import type { Purchase } from '@/domain/types'
import { formatDate, formatDateTime, formatDocNumber, formatMoney, formatNumber } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr } from '@/staff/i18n'
import DocLinesTable from './components/DocLinesTable'
import { filterSelectClass, matches, purchasePaidMap, userName } from './components/helpers'
import { inPeriod, usePeriod } from './components/period'
import PeriodFilter from './components/PeriodFilter'
import PurchaseFormModal from './components/PurchaseFormModal'
import StatTile from './components/StatTile'

/** Prixod (kirim) hujjatlari: yetkazib beruvchidan kelgan tovar, to'langan qismi va qarz. */
export default function PurchasesPage() {
  useDocumentTitle(tr('Prixod', 'Приход'))
  const db = useDb()
  const [period, setPeriod] = usePeriod('all')
  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const supplierName = (id: string) => db.suppliers.find((supplier) => supplier.id === id)?.name ?? '—'
  const paidMap = useMemo(() => purchasePaidMap(db), [db])
  const rows = useMemo(
    () =>
      db.purchases
        .filter(
          (purchase) =>
            inPeriod(period, purchase.date) &&
            (!supplierId || purchase.supplierId === supplierId) &&
            matches(query, formatDocNumber('PR', purchase.number), purchase.number, purchase.note),
        )
        .map((purchase) => {
          const paid = paidMap.get(purchase.id) ?? 0
          return { ...purchase, paid, debt: purchase.total - paid }
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number),
    [db, paidMap, period, supplierId, query],
  )
  const { pageItems, pagination, reset } = usePagination(rows, `${period.from}|${period.to}|${supplierId}|${query}`)
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const unpaid = rows.reduce((sum, row) => sum + Math.max(0, row.debt), 0)
  const open: (Purchase & { paid: number; debt: number }) | undefined = rows.find((row) => row.id === openId)

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Prixod', 'Приход')}
        description={tr('Yetkazib beruvchilardan kelgan tovarlar — omborga kirim', 'Товары от поставщиков — поступление на склад')}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn-primary flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
            <Plus size={16} />
            {tr('Yangi prixod', 'Новый приход')}
          </button>
        }
      />

      <PeriodFilter value={period} onChange={setPeriod} allowAll />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label={tr('Prixodlar soni', 'Количество приходов')} value={formatNumber(rows.length)} />
        <StatTile label={tr('Jami summa', 'Общая сумма')} value={formatMoney(total)} />
        <StatTile label={tr("To'lanmagan (qarz)", 'Не оплачено (долг)')} value={formatMoney(unpaid)} negative={unpaid > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <SearchInput value={query} onChange={setQuery} placeholder={tr('Raqam yoki izoh', 'Номер или комментарий')} />
        </div>
        <select aria-label={tr('Yetkazib beruvchi', 'Поставщик')} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={filterSelectClass}>
          <option value="">{tr('Barcha yetkazib beruvchilar', 'Все поставщики')}</option>
          {db.suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={PackagePlus} title={tr('Prixod topilmadi', 'Приходы не найдены')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Raqam', 'Номер')}</th>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={thClass}>{tr('Yetkazib beruvchi', 'Поставщик')}</th>
                    <th className={`${thClass} text-right`}>{tr('Pozitsiyalar', 'Позиции')}</th>
                    <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                    <th className={`${thClass} text-right`}>{tr("To'langan", 'Оплачено')}</th>
                    <th className={`${thClass} text-right`}>{tr('Qarz', 'Долг')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => (
                    <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                      <td className={`${tdClass} font-mono font-semibold text-neutral-900`}>{formatDocNumber('PR', row.number)}</td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(row.date)}</td>
                      <td className={tdClass}>{supplierName(row.supplierId)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{row.lines.length}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(row.total)}</td>
                      <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(row.paid)}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums ${row.debt > 0 ? 'text-red-700' : 'text-neutral-400'}`}>
                        {row.debt > 0 ? formatMoney(row.debt) : '—'}
                      </td>
                      <td className={`${tdClass} w-10`} onClick={(event) => event.stopPropagation()}>
                        <IconButton label={tr("Ko'rish", 'Просмотр')} onClick={() => setOpenId(row.id)}>
                          <Eye size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </>
        )}
      </Card>

      {creating && (
        <PurchaseFormModal
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            reset()
            setOpenId(id)
          }}
        />
      )}

      {open && (
        <Modal title={`${tr('Prixod', 'Приход')} ${formatDocNumber('PR', open.number)}`} onClose={() => setOpenId(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [tr('Sana', 'Дата'), formatDate(open.date)],
                [tr('Yetkazib beruvchi', 'Поставщик'), supplierName(open.supplierId)],
                [tr('Kiritdi', 'Оформил'), userName(db, open.userId)],
                [tr('Kiritilgan', 'Создан'), formatDateTime(open.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{label}</p>
                  <p className="mt-0.5 truncate text-sm text-neutral-900">{value}</p>
                </div>
              ))}
            </div>
            <DocLinesTable lines={open.lines} />
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <p className="flex justify-between gap-4 font-bold text-neutral-900">
                <span>{tr('Jami', 'Итого')}</span>
                <span className="tabular-nums">{formatMoney(open.total)}</span>
              </p>
              <p className="flex justify-between gap-4 text-neutral-600">
                <span>{tr("To'langan", 'Оплачено')}</span>
                <span className="tabular-nums">{formatMoney(open.paid)}</span>
              </p>
              <p className={`flex justify-between gap-4 font-semibold ${open.debt > 0 ? 'text-red-700' : 'text-neutral-600'}`}>
                <span>{tr('Qarz', 'Долг')}</span>
                <span className="tabular-nums">{formatMoney(Math.max(0, open.debt))}</span>
              </p>
            </div>
            {open.note && <p className="rounded bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{open.note}</p>}
            {open.debt > 0 && (
              <p className="text-xs text-neutral-500">
                {tr(
                  `Qarzni "Yetkazib beruvchilar" bo'limida "To'lov qilish" orqali yoping.`,
                  'Погасите долг в разделе «Поставщики» кнопкой «Внести оплату».',
                )}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
