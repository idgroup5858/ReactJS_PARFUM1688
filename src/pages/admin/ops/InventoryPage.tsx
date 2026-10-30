import { ClipboardCheck, Eye, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { allStockKeys, balanceOf, parseStockKey, stockItemName, stockUnit } from '@/domain/stock'
import type { InventoryCount, InventoryLine, StockKey, StockKind } from '@/domain/types'
import { todayKey } from '@/lib/dates'
import { formatDate, formatDateTime, formatDocNumber, formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import { STOCK_KIND_SHORT, confirmDiscard, escapeHtml, formatStockQty, matches, stockImage, unitLabel, userName } from './components/helpers'
import { NumberInput } from './components/inputs'

const diffValue = (lines: InventoryLine[]) => lines.reduce((sum, line) => sum + (line.actual - line.expected) * line.unitCost, 0)

function DiffQty({ stockKey, diff }: { stockKey: StockKey; diff: number }) {
  if (diff === 0) return <span className="text-neutral-400">0</span>
  return (
    <span className={`font-semibold ${diff > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
      {diff > 0 ? '+' : '−'}
      {formatStockQty(stockKey, Math.abs(diff))}
    </span>
  )
}

/** Inventarizatsiya: ombordagi haqiqiy qoldiq sanaladi, tizimdagi bilan farqi tuzatish harakati sifatida yoziladi. */
export default function InventoryPage() {
  useDocumentTitle(tr('Inventarizatsiya', 'Инвентаризация'))
  const db = useDb()
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = useMemo(() => [...db.inventories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db])
  const { pageItems, pagination, reset } = usePagination(rows)
  const open = rows.find((row) => row.id === openId)

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Inventarizatsiya', 'Инвентаризация')}
        description={tr('Haqiqiy qoldiqni sanash va tizimdagi bilan tenglashtirish', 'Пересчёт фактических остатков и выравнивание с системой')}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn-primary flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
            <Plus size={16} />
            {tr('Yangi sanoq', 'Новый пересчёт')}
          </button>
        }
      />

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ClipboardCheck} title={tr('Hali inventarizatsiya qilinmagan', 'Инвентаризаций ещё не было')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Raqam', 'Номер')}</th>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={`${thClass} text-right`}>{tr('Sanalgan', 'Посчитано')}</th>
                    <th className={`${thClass} text-right`}>{tr('Farqli', 'С расхождением')}</th>
                    <th className={`${thClass} text-right`}>{tr('Farq qiymati', 'Сумма расхождения')}</th>
                    <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                    <th className={thClass}>{tr('Izoh', 'Комментарий')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => {
                    const value = diffValue(row.lines)
                    return (
                      <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                        <td className={`${tdClass} font-mono font-semibold text-neutral-900`}>{formatDocNumber('INV', row.number)}</td>
                        <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(row.date)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{row.lines.length}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{row.lines.filter((line) => line.actual !== line.expected).length}</td>
                        <td className={`${tdClass} text-right font-semibold tabular-nums ${value < 0 ? 'text-red-700' : value > 0 ? 'text-emerald-700' : 'text-neutral-400'}`}>
                          {formatMoney(value)}
                        </td>
                        <td className={`${tdClass} text-neutral-600`}>{userName(db, row.userId)}</td>
                        <td className={`${tdClass} max-w-48 truncate text-neutral-500`}>{row.note ?? ''}</td>
                        <td className={`${tdClass} w-10`} onClick={(event) => event.stopPropagation()}>
                          <IconButton label={tr("Ko'rish", 'Просмотр')} onClick={() => setOpenId(row.id)}>
                            <Eye size={15} />
                          </IconButton>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </>
        )}
      </Card>

      {creating && (
        <CountModal
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            reset()
            setOpenId(id)
          }}
        />
      )}
      {open && <DetailsModal inventory={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function DetailsModal({ inventory, onClose }: { inventory: InventoryCount; onClose: () => void }) {
  const db = useDb()
  const value = diffValue(inventory.lines)
  return (
    <Modal title={`${tr('Inventarizatsiya', 'Инвентаризация')} ${formatDocNumber('INV', inventory.number)}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          {formatDate(inventory.date)} · {userName(db, inventory.userId)} · {tr('kiritilgan', 'создан')} {formatDateTime(inventory.createdAt)}
        </p>
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className={thClass}>{tr('Pozitsiya', 'Позиция')}</th>
                <th className={`${thClass} text-right`}>{tr('Tizimda', 'В системе')}</th>
                <th className={`${thClass} text-right`}>{tr('Sanalgan', 'Посчитано')}</th>
                <th className={`${thClass} text-right`}>{tr('Farq', 'Разница')}</th>
                <th className={`${thClass} text-right`}>{tr('Farq qiymati', 'Сумма расхождения')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {inventory.lines.map((line) => (
                <tr key={line.key}>
                  <td className={`${tdClass} min-w-48 whitespace-normal!`}>{stockItemName(db, line.key)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatStockQty(line.key, line.expected)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatStockQty(line.key, line.actual)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    <DiffQty stockKey={line.key} diff={line.actual - line.expected} />
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney((line.actual - line.expected) * line.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm text-neutral-600">
          {tr('Jami farq', 'Итого расхождение')}: <b className={value < 0 ? 'text-red-700' : 'text-neutral-900'}>{formatMoney(value)}</b>
        </p>
        {inventory.note && <p className="rounded bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{inventory.note}</p>}
      </div>
    </Modal>
  )
}

type KindFilter = 'all' | StockKind

/** Tasdiqlash oynasida ko'rsatiladigan farqli qatorlar soni (qolgani "yana N ta"). */
const CONFIRM_LIST_LIMIT = 8

/**
 * Yangi sanoq: pozitsiyalar ro'yxati (tur / qidiruv bo'yicha), "Sanalgan" kiritilganlari hujjatga kiradi.
 * Maydon tozalansa pozitsiya yana "sanalmagan" bo'ladi (0 emas) — tasodifan butun qoldiq hisobdan chiqib ketmasin.
 */
function CountModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const db = useDb()
  const [kind, setKind] = useState<KindFilter>('gram')
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const [counted, setCounted] = useState<Partial<Record<StockKey, number>>>({})

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
  const entered = (Object.entries(counted) as [StockKey, number][]).filter(([, value]) => value !== undefined)
  const totalDiff = entered.reduce((sum, [key, actual]) => {
    const balance = balanceOf(db, key)
    return sum + (actual - balance.qty) * balance.avgCost
  }, 0)

  const fillExpected = () =>
    setCounted((current) => {
      const next = { ...current }
      for (const item of items) if (next[item.key] === undefined) next[item.key] = Math.max(0, item.balance.qty)
      return next
    })

  const setCount = (key: StockKey, value: number | undefined) =>
    setCounted((current) => {
      const next = { ...current }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })

  const requestClose = async () => {
    if (await confirmDiscard(entered.length > 0 || note.trim() !== '')) onClose()
  }

  const save = async () => {
    if (entered.length === 0) return void AppSwal.fire({ icon: 'warning', title: tr("Kamida bitta pozitsiyaning sanalgan qoldig'ini kiriting", 'Введите посчитанный остаток хотя бы для одной позиции') })
    // farqli qatorlar oynada nomma-nom: qaysi qoldiq nimaga almashishi saqlashdan oldin ko'rinsin
    const changed = entered.flatMap(([key, actual]) => {
      const expected = balanceOf(db, key).qty
      return actual === expected ? [] : [{ key, expected, actual }]
    })
    const list = changed
      .slice(0, CONFIRM_LIST_LIMIT)
      .map(
        ({ key, expected, actual }) =>
          `<li>${escapeHtml(stockItemName(db, key))}: ${formatStockQty(key, expected)} → <b class="${actual === 0 ? 'text-red-700' : 'text-neutral-900'}">${formatStockQty(key, actual)}</b></li>`,
      )
      .join('')
    const rest = changed.length - CONFIRM_LIST_LIMIT
    const more = rest > 0 ? `<li class="text-neutral-500">${tr(`yana ${rest} ta`, `ещё ${rest}`)}</li>` : ''
    const result = await AppSwal.fire({
      icon: 'question',
      title: tr('Sanoqni saqlash', 'Сохранение пересчёта'),
      html:
        `<p>${tr(
          `${entered.length} ta pozitsiya sanaldi, ${changed.length} tasida farq bor. Qoldiqlar sanalgan qiymatga tenglashtiriladi.`,
          `Посчитано ${entered.length} ${ruPlural(entered.length, 'позиция', 'позиции', 'позиций')}, расхождение в ${changed.length}. Остатки будут приведены к посчитанным значениям.`,
        )}</p>` +
        (list ? `<ul class="mt-3 space-y-1 text-xs">${list}${more}</ul>` : ''),
      showCancelButton: true,
      confirmButtonText: tr('Saqlash', 'Сохранить'),
    })
    if (!result.isConfirmed) return
    // "kutilgan" qoldiq va tannarx serverda saqlash paytida olinadi (kassa shu orada sotgan bo'lishi mumkin)
    const saved = await commit(() =>
      http.post<InventoryCount>('/inventories', {
        date,
        note: note.trim() || undefined,
        lines: entered.map(([key, actual]) => ({ key, actual })),
      }),
    )
    if (!saved) return
    showToast(tr(`${formatDocNumber('INV', saved.number)} saqlandi`, `${formatDocNumber('INV', saved.number)} сохранена`))
    onSaved(saved.id)
    onClose()
  }

  return (
    <Modal
      title={tr('Yangi inventarizatsiya', 'Новая инвентаризация')}
      onClose={() => void requestClose()}
      size="xl"
      footer={
        <>
          <p className="mr-auto hidden self-center text-xs text-neutral-500 sm:block">
            {tr('Kiritilgan', 'Введено')}: <b className="text-neutral-900">{formatNumber(entered.length)}</b> · {tr('farq qiymati', 'сумма расхождения')}:{' '}
            <b className={totalDiff < 0 ? 'text-red-700' : 'text-neutral-900'}>{formatMoney(totalDiff)}</b>
          </p>
          <button type="button" onClick={() => void requestClose()} className="btn-ghost h-10 rounded px-5 text-sm font-semibold">
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void save()} className="btn-primary h-10 rounded px-6 text-sm font-semibold">
            {tr('Saqlash', 'Сохранить')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Field label={tr('Sana', 'Дата')} htmlFor="inv-date">
            <input id="inv-date" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value || todayKey())} className={inputClass} />
          </Field>
          <Field label={tr('Izoh', 'Комментарий')} htmlFor="inv-note">
            <input id="inv-note" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} placeholder={tr('Masalan: oylik sanoq', 'Например: ежемесячный пересчёт')} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="min-w-48 flex-1">
            <SearchInput value={query} onChange={setQuery} placeholder={tr('Pozitsiya nomi', 'Название позиции')} />
          </div>
          <button
            type="button"
            onClick={fillExpected}
            className="btn-ghost h-9 rounded px-3 text-xs font-semibold"
            title={tr("Ro'yxatdagi kiritilmaganlarni tizimdagi qoldiq bilan to'ldirish", 'Заполнить невведённые позиции списка остатком из системы')}
          >
            {tr("Tizimdagi bilan to'ldirish", 'Заполнить по системе')}
          </button>
        </div>
        <div className="rounded border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Pozitsiya', 'Позиция')}</th>
                  <th className={`${thClass} text-right`}>{tr('Tizimda', 'В системе')}</th>
                  <th className={`${thClass} text-right`}>{tr('Sanalgan', 'Посчитано')}</th>
                  <th className={`${thClass} text-right`}>{tr('Farq', 'Разница')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((item) => {
                  const actual = counted[item.key]
                  return (
                    <tr key={item.key} className={actual !== undefined ? 'bg-brand-50/40' : ''}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2.5">
                          <Img path={stockImage(db, item.key)} alt="" fit="contain" className="bg-photo h-9 w-9 shrink-0 rounded" />
                          <div className="min-w-48 whitespace-normal">
                            <p className="font-medium text-neutral-900">{item.name}</p>
                            <p className="text-xs text-neutral-500">{STOCK_KIND_SHORT[parseStockKey(item.key).kind]}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatStockQty(item.key, item.balance.qty)}</td>
                      <td className={`${tdClass} w-40`}>
                        <NumberInput
                          allowEmpty
                          ariaLabel={`${tr('Sanalgan', 'Посчитано')}: ${item.name}`}
                          value={actual}
                          suffix={unitLabel(stockUnit(item.key))}
                          onChange={(value) => setCount(item.key, value)}
                        />
                      </td>
                      <td className={`${tdClass} w-32 text-right tabular-nums`}>
                        {actual === undefined ? <span className="text-xs text-neutral-400">{tr('sanalmagan', 'не посчитано')}</span> : <DiffQty stockKey={item.key} diff={actual - item.balance.qty} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} />
        </div>
      </div>
    </Modal>
  )
}
