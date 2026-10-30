import { Check, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { usePagination } from '@/components/ui/usePagination'
import { useDb } from '@/data/db'
import { allStockKeys, balanceOf, parseStockKey, stockItemName } from '@/domain/stock'
import type { StockKey, StockKind } from '@/domain/types'
import { formatMoney } from '@/lib/format'
import { tr } from '@/staff/i18n'
import { STOCK_KIND_SHORT, formatStockQty, matches, stockImage } from './helpers'

type Props = {
  /** allaqachon qo'shilganlar — belgilanadi, qayta qo'shilmaydi */
  selected: StockKey[]
  onPick: (key: StockKey) => void
  onClose: () => void
}

type KindFilter = 'all' | StockKind

/** Ombor pozitsiyasini tanlash: qidiruv + tur bo'yicha filtr; bir nechtasini ketma-ket qo'shish mumkin. */
export default function StockPickerModal({ selected, onPick, onClose }: Props) {
  const db = useDb()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const items = useMemo(
    () =>
      allStockKeys(db)
        .filter((key) => kind === 'all' || parseStockKey(key).kind === kind)
        .map((key) => ({ key, name: stockItemName(db, key), balance: balanceOf(db, key) }))
        .filter((item) => matches(query, item.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [db, kind, query],
  )
  const { pageItems, pagination } = usePagination(items, `${kind}|${query}`)

  return (
    <Modal
      title={tr('Pozitsiya tanlash', 'Выбор позиции')}
      onClose={onClose}
      size="lg"
      footer={
        <button type="button" onClick={onClose} className="btn-primary ml-auto h-10 rounded px-6 text-sm font-semibold">
          {tr('Tayyor', 'Готово')}
        </button>
      }
    >
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder={tr('Atir yoki flakon nomi', 'Название аромата или флакона')} autoFocus />
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
        <ul className="divide-y divide-neutral-100 rounded border border-neutral-200">
          {pageItems.length === 0 && <li className="px-4 py-8 text-center text-sm text-neutral-400">{tr('Hech narsa topilmadi', 'Ничего не найдено')}</li>}
          {pageItems.map((item) => {
            const added = selected.includes(item.key)
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onPick(item.key)}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:bg-brand-50"
                >
                  <Img path={stockImage(db, item.key)} alt="" fit="contain" className="bg-photo h-10 w-10 shrink-0 rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">{item.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {STOCK_KIND_SHORT[parseStockKey(item.key).kind]} · {tr('qoldiq', 'остаток')} {formatStockQty(item.key, item.balance.qty)} ·{' '}
                      {tr('tannarx', 'себестоимость')} {formatMoney(item.balance.avgCost)}
                    </span>
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${added ? 'text-brand-700' : 'btn-icon'}`}>
                    {added ? <Check size={16} /> : <Plus size={16} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <Pagination {...pagination} />
      </div>
    </Modal>
  )
}
