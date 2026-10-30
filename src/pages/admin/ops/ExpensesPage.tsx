import { Pencil, Plus, Tags, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { PAYMENT_LABEL, PAYMENT_TYPES } from '@/domain/labels'
import type { Expense, PaymentType } from '@/domain/types'
import { todayKey } from '@/lib/dates'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import BarList from './components/BarList'
import { filterSelectClass, userName } from './components/helpers'
import { NumberInput } from './components/inputs'
import { inPeriod, usePeriod } from './components/period'
import PeriodFilter from './components/PeriodFilter'
import StatTile from './components/StatTile'

type FormState = { id?: string; date: string; categoryId: string; amount: number; payment: PaymentType; note: string }

/** Chiqimlar: ijara, oylik, kommunal, reklama... — davr va kategoriya bo'yicha, kategoriyalar kesimida jami. */
export default function ExpensesPage() {
  useDocumentTitle(tr('Chiqimlar', 'Расходы'))
  const db = useDb()
  const [period, setPeriod] = usePeriod('month')
  const [categoryId, setCategoryId] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [managing, setManaging] = useState(false)

  const categoryName = (id: string) => db.expenseCategories.find((category) => category.id === id)?.name ?? '—'
  const inRange = useMemo(() => db.expenses.filter((expense) => inPeriod(period, expense.date)), [db, period])
  const rows = useMemo(
    () =>
      inRange
        .filter((expense) => !categoryId || expense.categoryId === categoryId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [inRange, categoryId],
  )
  const { pageItems, pagination } = usePagination(rows, `${period.from}|${period.to}|${categoryId}`)
  const total = rows.reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory = useMemo(() => {
    const sums = new Map<string, { sum: number; count: number }>()
    for (const expense of inRange) {
      const value = sums.get(expense.categoryId) ?? { sum: 0, count: 0 }
      value.sum += expense.amount
      value.count += 1
      sums.set(expense.categoryId, value)
    }
    return [...sums].sort((a, b) => b[1].sum - a[1].sum)
  }, [inRange])

  const openNew = () =>
    setForm({ date: todayKey(), categoryId: categoryId || db.expenseCategories[0]?.id || '', amount: 0, payment: 'cash', note: '' })
  const openEdit = (expense: Expense) =>
    setForm({ id: expense.id, date: expense.date, categoryId: expense.categoryId, amount: expense.amount, payment: expense.payment, note: expense.note ?? '' })

  const saveForm = async () => {
    if (!form) return
    if (!form.categoryId) return void AppSwal.fire({ icon: 'warning', title: tr('Kategoriyani tanlang', 'Выберите категорию') })
    if (form.amount <= 0) return void AppSwal.fire({ icon: 'warning', title: tr('Summani kiriting', 'Введите сумму') })
    const body = { date: form.date, categoryId: form.categoryId, amount: form.amount, payment: form.payment, note: form.note.trim() || undefined }
    const saved = await commit(() => (form.id ? http.put(`/expenses/${form.id}`, body) : http.post('/expenses', body)))
    if (saved === null) return
    showToast(form.id ? tr('Saqlandi', 'Сохранено') : tr("Chiqim qo'shildi", 'Расход добавлен'))
    setForm(null)
  }

  const remove = async (expense: Expense) => {
    const result = await AppSwal.fire({
      icon: 'warning',
      title: tr("Chiqimni o'chirish", 'Удаление расхода'),
      text: `${formatDate(expense.date)} · ${categoryName(expense.categoryId)} · ${formatMoney(expense.amount)}`,
      showCancelButton: true,
      confirmButtonText: tr("O'chirish", 'Удалить'),
    })
    if (!result.isConfirmed) return
    if ((await commit(() => http.delete(`/expenses/${expense.id}`))) === null) return
    showToast(tr("O'chirildi", 'Удалено'))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Chiqimlar', 'Расходы')}
        description={tr("Do'kon xarajatlari — sof foyda hisobiga kiradi", 'Расходы магазина — учитываются в чистой прибыли')}
        actions={
          <>
            <button type="button" onClick={() => setManaging(true)} className="btn-ghost flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
              <Tags size={16} />
              {tr('Kategoriyalar', 'Категории')}
            </button>
            <button type="button" onClick={openNew} className="btn-primary flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
              <Plus size={16} />
              {tr("Chiqim qo'shish", 'Добавить расход')}
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter value={period} onChange={setPeriod} allowAll />
        <select aria-label={tr('Kategoriya', 'Категория')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={filterSelectClass}>
          <option value="">{tr('Barcha kategoriyalar', 'Все категории')}</option>
          {db.expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/*
        min-w-0 / minmax(0, …): keng jadval ustunni (va telefonda butun sahifani) kengaytirib yubormasin — jadval o'z
        ichida suriladi. O'ng panel 18rem — 1280–1366px da jadval amallar ustuni bilan to'liq sig'adi.
      */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-5">
          {/* aniq summa ("24 290 000 so'm") tor telefonda yarim kenglikka sig'maydi — u yerda ustma-ust */}
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
            <StatTile label={categoryId ? categoryName(categoryId) : tr('Jami chiqim', 'Всего расходов')} value={formatMoney(total)} />
            <StatTile label={tr('Yozuvlar', 'Записи')} value={formatNumber(rows.length)} />
          </div>
          <Card>
            {rows.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Wallet} title={tr("Bu davrda chiqim yo'q", 'За этот период расходов нет')} />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50">
                      <tr>
                        <th className={thClass}>{tr('Sana', 'Дата')}</th>
                        <th className={thClass}>{tr('Kategoriya / izoh', 'Категория / комментарий')}</th>
                        <th className={`${thClass} text-right`}>{tr('Summa', 'Сумма')}</th>
                        <th className={thClass}>{tr("To'lov", 'Оплата')}</th>
                        <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                        <th className={thClass} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {pageItems.map((expense) => (
                        <tr key={expense.id} className="transition-colors hover:bg-neutral-50">
                          <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(expense.date)}</td>
                          {/* izoh kategoriya ostida (alohida ustun emas) va qatorga o'tadi — 1366px da ham tahrirlash / o'chirish tugmalari sig'sin */}
                          <td className={tdClass}>
                            <p className="text-neutral-900">{categoryName(expense.categoryId)}</p>
                            {expense.note && (
                              <p title={expense.note} className="line-clamp-2 max-w-64 min-w-32 text-xs whitespace-normal text-neutral-500">
                                {expense.note}
                              </p>
                            )}
                          </td>
                          <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(expense.amount)}</td>
                          <td className={`${tdClass} text-neutral-600`}>{PAYMENT_LABEL[expense.payment]}</td>
                          <td className={`${tdClass} text-neutral-600`}>{userName(db, expense.userId)}</td>
                          <td className={`${tdClass} w-20`}>
                            <div className="flex justify-end gap-1">
                              <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => openEdit(expense)}>
                                <Pencil size={15} />
                              </IconButton>
                              <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(expense)}>
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
        </div>

        <div className="min-w-0">
          <Card>
            <CardHeader title={tr("Kategoriyalar bo'yicha", 'По категориям')} hint={tr('Tanlangan davrda', 'За выбранный период')} />
            <BarList
              rows={byCategory.map(([id, value]) => ({
                id,
                label: categoryName(id),
                value: value.sum,
                valueLabel: formatMoney(value.sum),
                sub: tr(`${value.count} ta yozuv`, `${value.count} ${ruPlural(value.count, 'запись', 'записи', 'записей')}`),
              }))}
              empty={tr("Chiqim yo'q", 'Расходов нет')}
            />
          </Card>
        </div>
      </div>

      {form && (
        <Modal
          title={form.id ? tr('Chiqimni tahrirlash', 'Редактирование расхода') : tr("Chiqim qo'shish", 'Добавить расход')}
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('Sana', 'Дата')} htmlFor="ex-date">
                <input id="ex-date" type="date" value={form.date} max={todayKey()} onChange={(event) => setForm({ ...form, date: event.target.value || todayKey() })} className={inputClass} />
              </Field>
              <Field label={tr('Kategoriya', 'Категория')} htmlFor="ex-category">
                <select id="ex-category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className={selectClass}>
                  {db.expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={tr('Summa', 'Сумма')} htmlFor="ex-amount">
              <NumberInput id="ex-amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} suffix={tr("so'm", 'сум')} autoFocus />
            </Field>
            <Field label={tr("To'lov turi", 'Способ оплаты')} htmlFor="ex-payment">
              <div id="ex-payment" className="grid grid-cols-4 gap-1.5">
                {PAYMENT_TYPES.map((payment) => (
                  <button
                    key={payment}
                    type="button"
                    onClick={() => setForm({ ...form, payment })}
                    className={`h-9 cursor-pointer rounded border text-sm font-semibold transition-colors ${form.payment === payment ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {PAYMENT_LABEL[payment]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={tr('Izoh', 'Комментарий')} htmlFor="ex-note">
              <input id="ex-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={inputClass} placeholder={tr('Ixtiyoriy', 'Необязательно')} />
            </Field>
          </div>
        </Modal>
      )}

      {managing && <CategoriesModal onClose={() => setManaging(false)} />}
    </div>
  )
}

/** Chiqim kategoriyalari: qo'shish, nomini o'zgartirish, ishlatilmaganini o'chirish. */
function CategoriesModal({ onClose }: { onClose: () => void }) {
  const db = useDb()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const usage = (id: string) => db.expenses.filter((expense) => expense.categoryId === id).length

  const add = async () => {
    const value = name.trim()
    if (!value) return
    if (db.expenseCategories.some((category) => category.name.toLowerCase() === value.toLowerCase())) {
      void AppSwal.fire({ icon: 'info', title: tr('Bunday kategoriya bor', 'Такая категория уже есть') })
      return
    }
    if ((await commit(() => http.post('/expense-categories', { name: value }))) === null) return
    setName('')
  }
  const rename = async () => {
    if (!editing || !editing.name.trim()) return
    if ((await commit(() => http.put(`/expense-categories/${editing.id}`, { name: editing.name.trim() }))) === null) return
    setEditing(null)
  }
  const remove = async (id: string) => {
    if (usage(id) > 0) {
      void AppSwal.fire({ icon: 'info', title: tr("O'chirib bo'lmaydi", 'Удалить нельзя'), text: tr('Bu kategoriyada chiqimlar bor.', 'В этой категории есть расходы.') })
      return
    }
    const result = await AppSwal.fire({
      icon: 'warning',
      title: tr("Kategoriyani o'chirish", 'Удаление категории'),
      showCancelButton: true,
      confirmButtonText: tr("O'chirish", 'Удалить'),
    })
    if (!result.isConfirmed) return
    await commit(() => http.delete(`/expense-categories/${id}`))
  }

  return (
    <Modal title={tr('Chiqim kategoriyalari', 'Категории расходов')} onClose={onClose}>
      <div className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void add()
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={tr('Yangi kategoriya', 'Новая категория')}
            aria-label={tr('Yangi kategoriya', 'Новая категория')}
            className={inputClass}
          />
          <button type="submit" className="btn-primary flex h-10 shrink-0 items-center gap-1.5 rounded px-4 text-sm font-semibold">
            <Plus size={16} />
            {tr("Qo'shish", 'Добавить')}
          </button>
        </form>
        <ul className="divide-y divide-neutral-100 rounded border border-neutral-200">
          {db.expenseCategories.map((category) => (
            <li key={category.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === category.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void rename()
                  }}
                >
                  <input autoFocus value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} aria-label={tr('Nomi', 'Название')} className={`${inputClass} h-9`} />
                  <button type="submit" className="btn-primary h-9 rounded px-3 text-xs font-semibold">
                    {tr('Saqlash', 'Сохранить')}
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">{category.name}</span>
                  <span className="text-xs text-neutral-400">{tr(`${usage(category.id)} ta`, `${usage(category.id)} шт.`)}</span>
                  <IconButton label={tr("Nomini o'zgartirish", 'Переименовать')} onClick={() => setEditing({ id: category.id, name: category.name })}>
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(category.id)}>
                    <Trash2 size={14} />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
