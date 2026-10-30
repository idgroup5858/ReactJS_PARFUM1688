import { Eye, PackageMinus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { WRITEOFF_REASONS, WRITEOFF_REASON_LABEL } from '@/domain/labels'
import { balanceOf } from '@/domain/stock'
import type { WriteOff, WriteOffReason } from '@/domain/types'
import { todayKey } from '@/lib/dates'
import { formatDate, formatDateTime, formatDocNumber, formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'
import DocLinesTable from './components/DocLinesTable'
import { confirmDiscard, filterSelectClass, userName } from './components/helpers'
import LinesEditor, { type DraftLine } from './components/LinesEditor'
import { inPeriod, usePeriod } from './components/period'
import PeriodFilter from './components/PeriodFilter'
import StatTile from './components/StatTile'

const costOf = (writeOff: WriteOff) => writeOff.lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0)

/** Spisanie: to'kilgan, singan, tester va h.k. — tovar ombordan tannarxda chiqariladi. */
export default function WriteOffsPage() {
  useDocumentTitle(tr('Spisanie', 'Списание'))
  const db = useDb()
  const [period, setPeriod] = usePeriod('all')
  const [reason, setReason] = useState<WriteOffReason | ''>('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      db.writeOffs
        .filter((item) => inPeriod(period, item.date) && (!reason || item.reason === reason))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db, period, reason],
  )
  const { pageItems, pagination, reset } = usePagination(rows, `${period.from}|${period.to}|${reason}`)
  const total = rows.reduce((sum, row) => sum + costOf(row), 0)
  const open = rows.find((row) => row.id === openId)

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Spisanie', 'Списание')}
        description={tr("Yaroqsiz bo'lgan yoki ishlatilgan tovarni ombordan chiqarish", 'Списание испорченного или израсходованного товара со склада')}
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn-primary flex h-9 items-center gap-1.5 rounded px-4 text-sm font-semibold">
            <Plus size={16} />
            {tr('Yangi spisanie', 'Новое списание')}
          </button>
        }
      />

      <PeriodFilter value={period} onChange={setPeriod} allowAll />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label={tr('Hujjatlar', 'Документы')} value={formatNumber(rows.length)} />
        <StatTile label={tr('Zarar (tannarxda)', 'Убыток (по себестоимости)')} value={formatMoney(total)} negative={total > 0} />
      </div>
      <select aria-label={tr('Sabab', 'Причина')} value={reason} onChange={(event) => setReason(event.target.value as WriteOffReason | '')} className={filterSelectClass}>
        <option value="">{tr('Barcha sabablar', 'Все причины')}</option>
        {WRITEOFF_REASONS.map((item) => (
          <option key={item} value={item}>
            {WRITEOFF_REASON_LABEL[item]}
          </option>
        ))}
      </select>

      <Card>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={PackageMinus} title={tr('Spisanie topilmadi', 'Списания не найдены')} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className={thClass}>{tr('Raqam', 'Номер')}</th>
                    <th className={thClass}>{tr('Sana', 'Дата')}</th>
                    <th className={thClass}>{tr('Sabab', 'Причина')}</th>
                    <th className={`${thClass} text-right`}>{tr('Pozitsiyalar', 'Позиции')}</th>
                    <th className={`${thClass} text-right`}>{tr('Tannarx', 'Себестоимость')}</th>
                    <th className={thClass}>{tr('Xodim', 'Сотрудник')}</th>
                    <th className={thClass}>{tr('Izoh', 'Комментарий')}</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((row) => (
                    <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                      <td className={`${tdClass} font-mono font-semibold text-neutral-900`}>{formatDocNumber('SPS', row.number)}</td>
                      <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDate(row.date)}</td>
                      <td className={tdClass}>{WRITEOFF_REASON_LABEL[row.reason]}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{row.lines.length}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(costOf(row))}</td>
                      <td className={`${tdClass} text-neutral-600`}>{userName(db, row.userId)}</td>
                      <td className={`${tdClass} max-w-48 truncate text-neutral-500`}>{row.note ?? ''}</td>
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
        <WriteOffModal
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            reset()
            setOpenId(id)
          }}
        />
      )}
      {open && (
        <Modal title={`${tr('Spisanie', 'Списание')} ${formatDocNumber('SPS', open.number)}`} onClose={() => setOpenId(null)} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              {formatDate(open.date)} · {WRITEOFF_REASON_LABEL[open.reason]} · {userName(db, open.userId)} · {tr('kiritilgan', 'создано')} {formatDateTime(open.createdAt)}
            </p>
            <DocLinesTable lines={open.lines} />
            <p className="text-right text-sm text-neutral-600">
              {tr('Jami tannarx', 'Итого по себестоимости')}: <b className="text-neutral-900">{formatMoney(costOf(open))}</b>
            </p>
            {open.note && <p className="rounded bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{open.note}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

function WriteOffModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const db = useDb()
  const [reason, setReason] = useState<WriteOffReason>('spill')
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const valid = lines.filter((line) => line.qty > 0)

  const requestClose = async () => {
    if (await confirmDiscard(lines.length > 0 || note.trim() !== '')) onClose()
  }

  const save = async () => {
    if (valid.length === 0) return void AppSwal.fire({ icon: 'warning', title: tr('Kamida bitta pozitsiya va miqdor kiriting', 'Добавьте хотя бы одну позицию с количеством') })
    const over = valid.filter((line) => line.qty > balanceOf(db, line.key).qty)
    if (over.length > 0) {
      const result = await AppSwal.fire({
        icon: 'warning',
        title: tr("Qoldiqdan ko'p", 'Больше остатка'),
        text: tr(
          `${over.length} ta pozitsiyada miqdor ombordagi qoldiqdan ko'p — qoldiq manfiy bo'ladi. Davom etilsinmi?`,
          `В ${over.length} ${ruPlural(over.length, 'позиции', 'позициях', 'позициях')} количество больше остатка на складе — остаток уйдёт в минус. Продолжить?`,
        ),
        showCancelButton: true,
        confirmButtonText: tr('Davom etish', 'Продолжить'),
      })
      if (!result.isConfirmed) return
    }
    // tannarx serverda — o'rtacha tannarx saqlash paytidagisi
    const saved = await commit(() =>
      http.post<WriteOff>('/write-offs', {
        date,
        reason,
        note: note.trim() || undefined,
        lines: valid.map((line) => ({ key: line.key, qty: line.qty })),
      }),
    )
    if (!saved) return
    showToast(tr(`${formatDocNumber('SPS', saved.number)} saqlandi`, `${formatDocNumber('SPS', saved.number)} сохранено`))
    onSaved(saved.id)
    onClose()
  }

  return (
    <Modal
      title={tr('Yangi spisanie', 'Новое списание')}
      onClose={() => void requestClose()}
      size="xl"
      footer={
        <>
          <button type="button" onClick={() => void requestClose()} className="btn-ghost ml-auto h-10 rounded px-5 text-sm font-semibold">
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void save()} className="btn-primary h-10 rounded px-6 text-sm font-semibold">
            {tr('Saqlash', 'Сохранить')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={tr('Sabab', 'Причина')} htmlFor="wo-reason">
            <select id="wo-reason" value={reason} onChange={(event) => setReason(event.target.value as WriteOffReason)} className={selectClass}>
              {WRITEOFF_REASONS.map((item) => (
                <option key={item} value={item}>
                  {WRITEOFF_REASON_LABEL[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr('Sana', 'Дата')} htmlFor="wo-date">
            <input id="wo-date" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value || todayKey())} className={inputClass} />
          </Field>
          <Field label={tr('Izoh', 'Комментарий')} htmlFor="wo-note">
            <input id="wo-note" value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} placeholder={tr('Ixtiyoriy', 'Необязательно')} />
          </Field>
        </div>
        <LinesEditor lines={lines} onChange={setLines} costEditable={false} warnOverStock />
        <p className="text-xs text-neutral-500">
          {tr(
            "Tovar o'rtacha tannarxda chiqariladi — summa zarar sifatida hisobga olinadi (Dashboard'dagi sof foydadan ayriladi).",
            'Товар списывается по средней себестоимости — сумма учитывается как убыток (вычитается из чистой прибыли на дашборде).',
          )}
        </p>
      </div>
    </Modal>
  )
}
