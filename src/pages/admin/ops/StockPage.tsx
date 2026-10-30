import { AlertTriangle, History, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Switch from '@/components/ui/Switch'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import { allStockKeys, balanceOf, isLowStock, parseStockKey, stockItemName } from '@/domain/stock'
import type { StockKey, StockKind } from '@/domain/types'
import { formatMoney, formatNumber } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import { STOCK_KIND_SHORT, formatMoneyShort, formatQty, formatStockQty, matches, stockImage } from './components/helpers'
import MovementsModal from './components/MovementsModal'
import StatTile from './components/StatTile'

type KindFilter = 'all' | StockKind

/** Ombor qoldiqlari: razliv (gramm), original flakonlar va taralar (dona) — tannarx, qiymat, harakatlar tarixi. */
export default function StockPage() {
  useDocumentTitle(tr('Qoldiqlar', 'Остатки'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [lowOnly, setLowOnly] = useState(false)
  const [historyKey, setHistoryKey] = useState<StockKey | null>(null)

  const all = useMemo(
    () =>
      allStockKeys(db).map((key) => {
        const balance = balanceOf(db, key)
        return { key, name: stockItemName(db, key), kind: parseStockKey(key).kind, ...balance, value: Math.max(0, balance.qty) * balance.avgCost, low: isLowStock(db, key) }
      }),
    [db],
  )
  const rows = useMemo(
    () =>
      all
        .filter((row) => (kind === 'all' || row.kind === kind) && (!lowOnly || row.low) && matches(query, row.name))
        .sort((a, b) => Number(b.low) - Number(a.low) || a.name.localeCompare(b.name)),
    [all, kind, lowOnly, query],
  )
  const { pageItems, pagination } = usePagination(rows, `${kind}|${lowOnly}|${query}`)
  const totalValue = all.reduce((sum, row) => sum + row.value, 0)
  const grams = all.filter((row) => row.kind === 'gram').reduce((sum, row) => sum + Math.max(0, row.qty), 0)
  const lowCount = all.filter((row) => row.low).length
  const gramCount = all.filter((row) => row.kind === 'gram').length

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Qoldiqlar', 'Остатки')}
        description={tr(
          `Kam qolish chegarasi: razliv ${formatQty(db.settings.lowStockGrams, 'g')}, dona — ${db.settings.lowStockPieces} ta`,
          `Порог «мало на складе»: розлив ${formatQty(db.settings.lowStockGrams, 'g')}, штучные — ${db.settings.lowStockPieces} шт.`,
        )}
        actions={
          <>
            <Link to="/admin/purchases" className="btn-primary flex h-9 items-center rounded px-4 text-sm font-semibold">
              {tr('Prixod qilish', 'Оформить приход')}
            </Link>
            <Link to="/admin/inventory" className="btn-ghost flex h-9 items-center rounded px-4 text-sm font-semibold">
              {tr('Inventarizatsiya', 'Инвентаризация')}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tr('Ombor qiymati (tannarxda)', 'Стоимость склада (по себестоимости)')} value={formatMoneyShort(totalValue)} fullValue={formatMoney(totalValue)} />
        <StatTile
          label={tr('Razliv atir jami', 'Всего на розлив')}
          value={formatQty(grams, 'g')}
          hint={tr(`${gramCount} ta atir`, `${gramCount} ${ruPlural(gramCount, 'аромат', 'аромата', 'ароматов')}`)}
        />
        <StatTile label={tr('Pozitsiyalar', 'Позиции')} value={formatNumber(all.length)} />
        <StatTile label={tr('Kam qolganlar', 'Заканчивается')} value={formatNumber(lowCount)} negative={lowCount > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchInput value={query} onChange={setQuery} placeholder={tr('Atir yoki flakon nomi', 'Название аромата или флакона')} />
        </div>
        <SegmentedControl
          label={tr('Tur', 'Тип')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: tr('Hammasi', 'Все') },
            { value: 'gram', label: STOCK_KIND_SHORT.gram },
            { value: 'bottle', label: STOCK_KIND_SHORT.bottle },
            { value: 'flakon', label: STOCK_KIND_SHORT.flakon },
          ]}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <Switch checked={lowOnly} onChange={setLowOnly} label={tr('Faqat kam qolganlar', 'Только заканчивающиеся')} />
          {tr('Faqat kam qolganlar', 'Только заканчивающиеся')}
        </label>
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Warehouse} title={tr('Pozitsiya topilmadi', 'Позиции не найдены')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Pozitsiya', 'Позиция')}</th>
                    <th className={thClass}>{tr('Tur', 'Тип')}</th>
                    <th className={`${thClass} text-right`}>{tr('Qoldiq', 'Остаток')}</th>
                    <th className={`${thClass} text-right`}>{tr('Tannarx (1 birlik)', 'Себестоимость (за ед.)')}</th>
                    <th className={`${thClass} text-right`}>{tr('Qiymati', 'Стоимость')}</th>
                    <th className={thClass}>{tr('Holat', 'Статус')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => (
                    <tr key={row.key} className="transition-colors hover:bg-neutral-50">
                      <td className={tdClass}>
                        <div className="flex items-center gap-2.5">
                          <Img path={stockImage(db, row.key)} alt="" fit="contain" className="bg-photo h-10 w-10 shrink-0 rounded" />
                          {/* nom to'liq: oxiridagi "— original 50 ml" / "— razliv" pozitsiyani ajratadi; sig'masa qatorga o'tadi */}
                          <span className="min-w-48 font-medium whitespace-normal text-neutral-900">{row.name}</span>
                        </div>
                      </td>
                      <td className={`${tdClass} text-neutral-600`}>{STOCK_KIND_SHORT[row.kind]}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums ${row.qty < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
                        {formatStockQty(row.key, row.qty)}
                      </td>
                      <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(row.avgCost)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(row.value)}</td>
                      <td className={tdClass}>
                        {row.qty < 0 ? (
                          <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            <AlertTriangle size={12} />
                            {tr('Manfiy', 'Минус')}
                          </span>
                        ) : row.low ? (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle size={12} />
                            {tr('Kam qoldi', 'Мало')}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">{tr('Yetarli', 'Достаточно')}</span>
                        )}
                      </td>
                      <td className={`${tdClass} w-10`}>
                        <IconButton label={tr('Harakatlar tarixi', 'История движений')} onClick={() => setHistoryKey(row.key)}>
                          <History size={15} />
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

      {historyKey && <MovementsModal stockKey={historyKey} onClose={() => setHistoryKey(null)} />}
    </div>
  )
}
