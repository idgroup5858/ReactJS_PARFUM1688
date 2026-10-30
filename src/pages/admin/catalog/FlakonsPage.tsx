import { FlaskConical, Pencil, Plus, Power, Trash } from 'lucide-react'
import { useState } from 'react'
import { http } from '@/api/http'
import Badge from '@/components/admin/Badge'
import { confirmDanger, showErrors } from '@/components/admin/confirm'
import { ImageField } from '@/components/admin/ImagePicker'
import NumberInput from '@/components/admin/NumberInput'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass, tdClass, thClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import { balanceOf, isLowStock, stockKey } from '@/domain/stock'
import type { Db, Flakon, ID } from '@/domain/types'
import { formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr } from '@/staff/i18n'

/** Tara buyurtma yoki ombor tarixida bormi — bo'lsa o'chirilmaydi, faqat nofaol qilinadi. */
function isReferenced(db: Db, flakonId: ID): boolean {
  const key = stockKey('flakon', flakonId)
  return db.orders.some((order) => order.lines.some((line) => line.flakon?.flakonId === flakonId)) || db.movements.some((movement) => movement.key === key)
}

const setActive = (flakonId: ID, active: boolean) => commit(() => http.patch(`/flakons/${flakonId}/active`, { active }))

function FlakonModal({ flakon, onClose }: { flakon: Flakon | null; onClose: () => void }) {
  const [name, setName] = useState(flakon?.name ?? '')
  const [volumeMl, setVolumeMl] = useState(flakon?.volumeMl ?? 50)
  const [price, setPrice] = useState(flakon?.price ?? 0)
  const [image, setImage] = useState(flakon?.image ?? '')
  const [active, setActiveState] = useState(flakon?.active ?? true)

  const save = async () => {
    const errors: string[] = []
    if (!name.trim()) errors.push(tr('Nomini kiriting', 'Введите название'))
    if (volumeMl <= 0) errors.push(tr('Hajmini kiriting', 'Введите объём'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const data = { name: name.trim(), volumeMl, price, image, active }
    if ((await commit(() => (flakon ? http.put(`/flakons/${flakon.id}`, data) : http.post('/flakons', data)))) === null) return
    showToast(flakon ? tr('Saqlandi', 'Сохранено') : tr("Flakon qo'shildi", 'Флакон добавлен'))
    onClose()
  }

  return (
    <Modal
      title={flakon ? tr('Flakonni tahrirlash', 'Редактирование флакона') : tr('Yangi flakon (tara)', 'Новый флакон (тара)')}
      size="wide"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`btn-ghost ${buttonClass} flex-1`}>
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" onClick={() => void save()} className={`btn-primary ${buttonClass} flex-1`}>
            {tr('Saqlash', 'Сохранить')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={tr('Nomi', 'Название')} htmlFor="flakon-name">
          <input
            id="flakon-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={tr('Flakon 50 ml', 'Флакон 50 мл')}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr('Hajmi', 'Объём')} htmlFor="flakon-volume">
            <NumberInput id="flakon-volume" value={volumeMl} onChange={setVolumeMl} suffix={tr('ml', 'мл')} />
          </Field>
          <Field label={tr('Sotuv narxi', 'Цена продажи')} htmlFor="flakon-price" hint={tr("Kassir «pullik» deb belgilasa qo'shiladi", 'Добавляется, если кассир отметит «платный»')}>
            <NumberInput id="flakon-price" value={price} onChange={setPrice} suffix={tr("so'm", 'сум')} />
          </Field>
        </div>
        <Field label={tr('Rasm', 'Фото')}>
          <ImageField folder="flakons" value={image} onChange={setImage} />
        </Field>
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-neutral-800">{tr('Faol', 'Активен')}</span>
            <span className="block text-xs text-neutral-500">{tr('Nofaol tara kassada tanlanmaydi', 'Неактивную тару нельзя выбрать в кассе')}</span>
          </span>
          <Switch checked={active} onChange={setActiveState} label={tr('Faol', 'Активен')} />
        </div>
      </div>
    </Modal>
  )
}

/** Admin → Flakonlar (tara): quyilgan atir solinadigan idishlar; kassir tanlaydi, tekin yoki pullik. */
export default function FlakonsPage() {
  useDocumentTitle(tr('Flakonlar', 'Флаконы'))
  const db = useDb()
  const [editing, setEditing] = useState<Flakon | 'new' | null>(null)
  const flakons = [...db.flakons].sort((a, b) => a.volumeMl - b.volumeMl || a.name.localeCompare(b.name))

  const remove = async (flakon: Flakon) => {
    if (isReferenced(db, flakon.id)) {
      const result = await AppSwal.fire({
        title: tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        text: tr(
          `"${flakon.name}" buyurtma yoki ombor tarixida bor. ${flakon.active ? "Uning o'rniga nofaol qilinsinmi?" : ''}`,
          `«${flakon.name}» есть в истории заказов или склада. ${flakon.active ? 'Сделать его неактивным?' : ''}`,
        ),
        icon: 'info',
        showCancelButton: flakon.active,
        confirmButtonText: flakon.active ? tr('Nofaol qilish', 'Сделать неактивным') : tr('Tushunarli', 'Понятно'),
      })
      if (result.isConfirmed && flakon.active && (await setActive(flakon.id, false)) !== null) {
        showToast(tr('Flakon nofaol qilindi', 'Флакон стал неактивным'))
      }
      return
    }
    if (!(await confirmDanger(tr("Flakonni o'chirish", 'Удаление флакона'), tr(`"${flakon.name}" o'chiriladi.`, `«${flakon.name}» будет удалён.`)))) return
    // ombor qatori ham serverda o'chadi
    if ((await commit(() => http.delete(`/flakons/${flakon.id}`))) === null) return
    showToast(tr("Flakon o'chirildi", 'Флакон удалён'))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Flakonlar (tara)', 'Флаконы (тара)')}
        description={tr(
          "Quyib sotilgan atir solinadigan idishlar. Qoldiq Prixod orqali to'ldiriladi.",
          'Ёмкости для разливных ароматов. Остаток пополняется через Приход.',
        )}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi flakon', 'Новый флакон')}
          </button>
        }
      />
      <Card>
        {flakons.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={FlaskConical} title={tr("Flakon yo'q", 'Флаконов нет')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Flakon', 'Флакон')}</th>
                  <th className={`${thClass} text-right`}>{tr('Hajmi', 'Объём')}</th>
                  <th className={`${thClass} text-right`}>{tr('Sotuv narxi', 'Цена продажи')}</th>
                  <th className={`${thClass} text-right`}>{tr('Qoldiq', 'Остаток')}</th>
                  <th className={thClass}>{tr('Holat', 'Статус')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {flakons.map((flakon) => {
                  const key = stockKey('flakon', flakon.id)
                  const low = isLowStock(db, key)
                  return (
                    <tr key={flakon.id} className={`hover:bg-neutral-50 ${flakon.active ? '' : 'opacity-60'}`}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <div className="bg-photo h-12 w-12 shrink-0 overflow-hidden rounded">
                            <Img path={flakon.image} alt={flakon.name} fit="contain" className="h-full w-full p-1" />
                          </div>
                          <span className="font-semibold text-neutral-900">{flakon.name}</span>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {flakon.volumeMl} {tr('ml', 'мл')}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(flakon.price)}</td>
                      <td className={`${tdClass} text-right tabular-nums ${low ? 'font-semibold text-amber-700' : ''}`}>
                        {formatNumber(balanceOf(db, key).qty)} {tr('dona', 'шт.')}
                      </td>
                      <td className={tdClass}>
                        <div className="flex gap-1">
                          {flakon.active ? <Badge tone="success">{tr('Faol', 'Активен')}</Badge> : <Badge>{tr('Nofaol', 'Неактивен')}</Badge>}
                          {low && <Badge tone="warning">{tr('Kam qoldi', 'Мало')}</Badge>}
                        </div>
                      </td>
                      <td className={tdClass}>
                        <div className="flex justify-end gap-1">
                          <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(flakon)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton
                            label={flakon.active ? tr('Nofaol qilish', 'Сделать неактивным') : tr('Faol qilish', 'Сделать активным')}
                            active={flakon.active}
                            onClick={() => void setActive(flakon.id, !flakon.active)}
                          >
                            <Power size={15} />
                          </IconButton>
                          <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(flakon)}>
                            <Trash size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <FlakonModal flakon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
