import { useState } from 'react'
import { http } from '@/api/http'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass, selectClass, textareaClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import type { ID, Purchase } from '@/domain/types'
import { todayKey } from '@/lib/dates'
import { formatDocNumber, formatMoney } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'
import { confirmDiscard } from './helpers'
import { NumberInput } from './inputs'
import LinesEditor, { type DraftLine } from './LinesEditor'

/**
 * Yangi prixod: yetkazib beruvchi, sana, qatorlar (pozitsiya · miqdor · kirim narxi) va shu zahoti to'langan summa.
 * Saqlanganda (`POST /api/purchases`): hujjat + har qator bo'yicha ombor kirimi (o'rtacha tannarx qayta hisoblanadi) +
 * to'lov (bo'lsa). To'lanmagan qismi yetkazib beruvchiga qarz bo'lib qoladi.
 */
export default function PurchaseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved?: (id: ID) => void }) {
  const db = useDb()
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id ?? '')
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [paid, setPaid] = useState(0)
  const valid = lines.filter((line) => line.qty > 0)
  const total = valid.reduce((sum, line) => sum + line.qty * line.unitCost, 0)
  const debt = Math.max(0, total - paid)

  const requestClose = async () => {
    if (await confirmDiscard(lines.length > 0 || paid > 0 || note.trim() !== '')) onClose()
  }

  const save = async () => {
    if (!supplierId) return void AppSwal.fire({ icon: 'warning', title: tr('Yetkazib beruvchini tanlang', 'Выберите поставщика') })
    if (valid.length === 0) return void AppSwal.fire({ icon: 'warning', title: tr('Kamida bitta pozitsiya va miqdor kiriting', 'Добавьте хотя бы одну позицию с количеством') })
    if (paid > total) return void AppSwal.fire({ icon: 'warning', title: tr("To'lov summadan ko'p bo'lmasin", 'Оплата не может превышать сумму') })
    // server: hujjat + ombor kirimi (o'rtacha tannarx) + to'lov — bitta tranzaksiyada
    const saved = await commit(() =>
      http.post<Purchase>('/purchases', {
        supplierId,
        date,
        paid,
        note: note.trim() || undefined,
        lines: valid.map((line) => ({ key: line.key, qty: line.qty, unitCost: line.unitCost })),
      }),
    )
    if (!saved) return
    showToast(tr(`${formatDocNumber('PR', saved.number)} saqlandi`, `${formatDocNumber('PR', saved.number)} сохранён`))
    onSaved?.(saved.id)
    onClose()
  }

  return (
    <Modal
      title={tr('Yangi prixod', 'Новый приход')}
      onClose={() => void requestClose()}
      size="xl"
      footer={
        <>
          <div className="mr-auto hidden flex-col justify-center text-xs text-neutral-500 sm:flex">
            <span>
              {tr('Jami', 'Итого')}: <b className="text-neutral-900">{formatMoney(total)}</b>
            </span>
            <span>
              {tr('Qarzga', 'В долг')}: <b className={debt > 0 ? 'text-red-700' : 'text-neutral-900'}>{formatMoney(debt)}</b>
            </span>
          </div>
          <button type="button" onClick={() => void requestClose()} className="btn-ghost h-10 rounded px-5 text-sm font-semibold">
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
          <Field label={tr('Yetkazib beruvchi', 'Поставщик')} htmlFor="pr-supplier">
            <select id="pr-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={selectClass}>
              {db.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr('Sana', 'Дата')} htmlFor="pr-date">
            <input id="pr-date" type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value || todayKey())} className={inputClass} />
          </Field>
          <Field
            label={tr("Shu zahoti to'langan", 'Оплачено сразу')}
            htmlFor="pr-paid"
            hint={total > 0 ? tr(`Qolgani (${formatMoney(debt)}) qarzga yoziladi`, `Остаток (${formatMoney(debt)}) запишется в долг`) : undefined}
          >
            <div className="flex gap-1.5">
              <NumberInput id="pr-paid" value={paid} onChange={setPaid} suffix={tr("so'm", 'сум')} className="flex-1" />
              <button type="button" onClick={() => setPaid(total)} className="btn-ghost h-10 shrink-0 rounded px-3 text-xs font-semibold">
                {tr("To'liq", 'Полностью')}
              </button>
            </div>
          </Field>
        </div>
        <LinesEditor lines={lines} onChange={setLines} costEditable />
        <Field label={tr('Izoh', 'Комментарий')} htmlFor="pr-note">
          <textarea id="pr-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} placeholder={tr('Ixtiyoriy', 'Необязательно')} />
        </Field>
      </div>
    </Modal>
  )
}
