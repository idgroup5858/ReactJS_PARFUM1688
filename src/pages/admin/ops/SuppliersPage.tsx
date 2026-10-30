import { BookOpen, Banknote, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import { inputClass, tdClass, textareaClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import type { Supplier } from '@/domain/types'
import { todayKey } from '@/lib/dates'
import { formatDate, formatDocNumber, formatMoney, formatNumber, formatPhone } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr } from '@/staff/i18n'
import { matches, supplierStats, userName } from './components/helpers'
import { NumberInput } from './components/inputs'
import StatTile from './components/StatTile'

type FormState = { id?: string; name: string; phone: string; note: string }

/** Yetkazib beruvchilar: kontaktlar, jami prixod, to'lovlar va qarz; to'lov qilish va akt-sverka (hisob-kitob tarixi). */
export default function SuppliersPage() {
  useDocumentTitle(tr('Yetkazib beruvchilar', 'Поставщики'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [payFor, setPayFor] = useState<Supplier | null>(null)
  const [ledgerFor, setLedgerFor] = useState<Supplier | null>(null)

  const stats = useMemo(() => supplierStats(db), [db])
  const rows = useMemo(
    () =>
      db.suppliers
        .filter((supplier) => matches(query, supplier.name, supplier.phone, supplier.note))
        .map((supplier) => ({ ...supplier, stats: stats.get(supplier.id) ?? { purchased: 0, paid: 0, debt: 0, purchases: 0 } }))
        .sort((a, b) => b.stats.debt - a.stats.debt || a.name.localeCompare(b.name)),
    [db, query, stats],
  )
  const { pageItems, pagination } = usePagination(rows, query)
  const totalDebt = [...stats.values()].reduce((sum, item) => sum + Math.max(0, item.debt), 0)
  const totalPurchased = [...stats.values()].reduce((sum, item) => sum + item.purchased, 0)

  const saveForm = async () => {
    if (!form) return
    const name = form.name.trim()
    if (!name) return void AppSwal.fire({ icon: 'warning', title: tr('Nomini kiriting', 'Введите название') })
    const body = { name, phone: form.phone.replace(/\D/g, ''), note: form.note.trim() || undefined }
    const saved = await commit(() => (form.id ? http.put(`/suppliers/${form.id}`, body) : http.post('/suppliers', body)))
    if (saved === null) return
    showToast(form.id ? tr('Saqlandi', 'Сохранено') : tr("Qo'shildi", 'Добавлено'))
    setForm(null)
  }

  const remove = async (supplier: Supplier) => {
    const used = db.purchases.some((item) => item.supplierId === supplier.id) || db.supplierPayments.some((item) => item.supplierId === supplier.id)
    if (used) {
      void AppSwal.fire({
        icon: 'info',
        title: tr("O'chirib bo'lmaydi", 'Удалить нельзя'),
        text: tr("Bu yetkazib beruvchida prixod yoki to'lovlar bor.", 'У этого поставщика есть приходы или оплаты.'),
      })
      return
    }
    const result = await AppSwal.fire({
      icon: 'warning',
      title: tr("O'chirish", 'Удаление'),
      text: tr(`${supplier.name} o'chirilsinmi?`, `Удалить «${supplier.name}»?`),
      showCancelButton: true,
      confirmButtonText: tr("O'chirish", 'Удалить'),
    })
    if (!result.isConfirmed) return
    if ((await commit(() => http.delete(`/suppliers/${supplier.id}`))) === null) return
    showToast(tr("O'chirildi", 'Удалено'))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Yetkazib beruvchilar', 'Поставщики')}
        description={tr("Prixodlar, to'lovlar va qarzdorlik", 'Приходы, оплаты и задолженность')}
        actions={
          <button type="button" onClick={() => setForm({ name: '', phone: '', note: '' })} className="btn-primary flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
            <Plus size={16} />
            {tr("Qo'shish", 'Добавить')}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label={tr('Yetkazib beruvchilar', 'Поставщики')} value={formatNumber(db.suppliers.length)} />
        <StatTile label={tr('Jami prixod', 'Всего приходов')} value={formatMoney(totalPurchased)} />
        <StatTile label={tr('Jami qarzimiz', 'Наш общий долг')} value={formatMoney(totalDebt)} negative={totalDebt > 0} />
      </div>

      <div className="w-full max-w-sm">
        <SearchInput value={query} onChange={setQuery} placeholder={tr('Nomi yoki telefon', 'Название или телефон')} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Truck} title={tr('Yetkazib beruvchi topilmadi', 'Поставщики не найдены')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Nomi', 'Название')}</th>
                    <th className={thClass}>{tr('Telefon', 'Телефон')}</th>
                    <th className={`${thClass} text-right`}>{tr('Prixodlar', 'Приходы')}</th>
                    <th className={`${thClass} text-right`}>{tr('Jami prixod', 'Всего приходов')}</th>
                    <th className={`${thClass} text-right`}>{tr("To'langan", 'Оплачено')}</th>
                    <th className={`${thClass} text-right`}>{tr('Qarz', 'Долг')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-neutral-50">
                      <td className={tdClass}>
                        <p className="font-medium text-neutral-900">{row.name}</p>
                        {row.note && <p className="max-w-64 truncate text-xs text-neutral-500">{row.note}</p>}
                      </td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{row.phone ? formatPhone(row.phone) : '—'}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{row.stats.purchases}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(row.stats.purchased)}</td>
                      <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(row.stats.paid)}</td>
                      <td className={tdClass}>
                        <span
                          className={`block text-right font-semibold tabular-nums ${row.stats.debt > 0 ? 'text-red-700' : row.stats.debt < 0 ? 'text-emerald-700' : 'text-neutral-400'}`}
                          title={row.stats.debt < 0 ? tr("Ortiqcha to'langan (avans)", 'Переплата (аванс)') : undefined}
                        >
                          {row.stats.debt === 0 ? '—' : formatMoney(row.stats.debt)}
                        </span>
                      </td>
                      <td className={`${tdClass} w-44`}>
                        <div className="flex justify-end gap-1">
                          <IconButton label={tr("To'lov qilish", 'Внести оплату')} onClick={() => setPayFor(row)}>
                            <Banknote size={15} />
                          </IconButton>
                          <IconButton label={tr('Akt-sverka (hisob-kitob tarixi)', 'Акт сверки (история расчётов)')} onClick={() => setLedgerFor(row)}>
                            <BookOpen size={15} />
                          </IconButton>
                          <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setForm({ id: row.id, name: row.name, phone: row.phone, note: row.note ?? '' })}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(row)}>
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
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

      {form && (
        <Modal
          title={form.id ? tr('Yetkazib beruvchini tahrirlash', 'Редактирование поставщика') : tr('Yangi yetkazib beruvchi', 'Новый поставщик')}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" onClick={() => setForm(null)} className="btn-ghost ml-auto h-10 rounded px-5 text-sm font-semibold">
                {tr('Bekor qilish', 'Отмена')}
              </button>
              <button type="button" onClick={() => void saveForm()} className="btn-primary h-10 rounded px-6 text-sm font-semibold">
                {tr('Saqlash', 'Сохранить')}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label={tr('Nomi', 'Название')} htmlFor="sup-name">
              <input id="sup-name" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />
            </Field>
            <Field label={tr('Telefon', 'Телефон')} htmlFor="sup-phone">
              <input
                id="sup-phone"
                inputMode="tel"
                value={form.phone}
                placeholder="+998 90 123 45 67"
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={tr('Izoh', 'Комментарий')} htmlFor="sup-note">
              <textarea id="sup-note" rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={textareaClass} />
            </Field>
          </div>
        </Modal>
      )}

      {payFor && <PaymentModal supplier={payFor} debt={stats.get(payFor.id)?.debt ?? 0} onClose={() => setPayFor(null)} />}
      {ledgerFor && <LedgerModal supplier={ledgerFor} onClose={() => setLedgerFor(null)} />}
    </div>
  )
}

/** Yetkazib beruvchiga to'lov — qarzni kamaytiradi (prixodlarga eng eskisidan taqsimlanadi). */
function PaymentModal({ supplier, debt, onClose }: { supplier: Supplier; debt: number; onClose: () => void }) {
  const [amount, setAmount] = useState(Math.max(0, debt))
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')

  const save = async () => {
    if (amount <= 0) return void AppSwal.fire({ icon: 'warning', title: tr('Summani kiriting', 'Введите сумму') })
    const saved = await commit(() =>
      http.post('/supplier-payments', { supplierId: supplier.id, date, amount, note: note.trim() || undefined }),
    )
    if (saved === null) return
    showToast(tr(`${formatMoney(amount)} to'landi`, `Оплачено ${formatMoney(amount)}`))
    onClose()
  }

  return (
    <Modal
      title={tr("To'lov qilish", 'Внести оплату')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost ml-auto h-10 rounded px-5 text-sm font-semibold">
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void save()} className="btn-primary h-10 rounded px-6 text-sm font-semibold">
            {tr("To'lash", 'Оплатить')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm font-medium text-neutral-900">{supplier.name}</span>
          <span className="shrink-0 text-sm text-neutral-500">
            {tr('Qarz', 'Долг')}: <b className={debt > 0 ? 'text-red-700' : 'text-neutral-900'}>{formatMoney(Math.max(0, debt))}</b>
          </span>
        </div>
        <Field label={tr('Summa', 'Сумма')} htmlFor="pay-amount">
          <NumberInput id="pay-amount" value={amount} onChange={setAmount} suffix={tr("so'm", 'сум')} autoFocus />
        </Field>
        <Field label={tr('Sana', 'Дата')} htmlFor="pay-date">
          <input id="pay-date" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value || todayKey())} className={inputClass} />
        </Field>
        <Field label={tr('Izoh', 'Комментарий')} htmlFor="pay-note">
          <input id="pay-note" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} placeholder={tr("Masalan: naqd, bank o'tkazmasi", 'Например: наличные, банковский перевод')} />
        </Field>
      </div>
    </Modal>
  )
}

/** Akt-sverka: prixodlar (+) va to'lovlar (−) sana bo'yicha, har qatordan keyingi qarz qoldig'i bilan. */
function LedgerModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const db = useDb()
  const entries = useMemo(() => {
    const items = [
      ...db.purchases
        .filter((purchase) => purchase.supplierId === supplier.id)
        .map((purchase) => ({
          id: purchase.id,
          date: purchase.date,
          at: purchase.createdAt,
          label: `${tr('Prixod', 'Приход')} ${formatDocNumber('PR', purchase.number)}`,
          amount: purchase.total,
          userId: purchase.userId,
        })),
      ...db.supplierPayments
        .filter((payment) => payment.supplierId === supplier.id)
        .map((payment) => ({
          id: payment.id,
          date: payment.date,
          // prixod bilan bir vaqtda kiritilgan to'lov prixoddan keyin tursin
          at: `${payment.createdAt}~`,
          label: payment.purchaseId
            ? `${tr("To'lov", 'Оплата')} (${formatDocNumber('PR', db.purchases.find((purchase) => purchase.id === payment.purchaseId)?.number ?? 0)})`
            : `${tr("To'lov", 'Оплата')}${payment.note ? ` — ${payment.note}` : ''}`,
          amount: -payment.amount,
          userId: payment.userId,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at))
    const withBalance: ((typeof items)[number] & { balance: number })[] = []
    for (const item of items) withBalance.push({ ...item, balance: (withBalance[withBalance.length - 1]?.balance ?? 0) + item.amount })
    return withBalance.reverse()
  }, [db, supplier.id])
  const { pageItems, pagination } = usePagination(entries, supplier.id)
  const debt = entries[0]?.balance ?? 0

  return (
    <Modal title={tr('Akt-sverka', 'Акт сверки')} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-base font-semibold text-neutral-900">{supplier.name}</p>
          <p className="text-sm text-neutral-500">
            {tr('Joriy qarz', 'Текущий долг')}: <b className={debt > 0 ? 'text-red-700' : 'text-neutral-900'}>{formatMoney(debt)}</b>
          </p>
        </div>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">{tr("Hali hisob-kitob yo'q", 'Расчётов ещё не было')}</p>
        ) : (
          <div className="rounded border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={thClass}>{tr('Hujjat', 'Документ')}</th>
                    <th className={`${thClass} text-right`}>{tr('Prixod', 'Приход')}</th>
                    <th className={`${thClass} text-right`}>{tr("To'lov", 'Оплата')}</th>
                    <th className={`${thClass} text-right`}>{tr("Qarz qoldig'i", 'Остаток долга')}</th>
                    <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((entry) => (
                    <tr key={entry.id}>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(entry.date)}</td>
                      <td className={tdClass}>{entry.label}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{entry.amount > 0 ? formatMoney(entry.amount) : ''}</td>
                      <td className={`${tdClass} text-right text-emerald-700 tabular-nums`}>{entry.amount < 0 ? formatMoney(-entry.amount) : ''}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(entry.balance)}</td>
                      <td className={`${tdClass} text-neutral-600`}>{userName(db, entry.userId)}</td>
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
