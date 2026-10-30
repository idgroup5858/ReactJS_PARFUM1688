import { Palette, Pencil, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { confirmDanger, explainBlocked, showErrors } from '@/components/admin/confirm'
import LocalizedInput from '@/components/admin/LocalizedInput'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import { buttonClass, inputClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { readableTextColor } from '@/domain/presets'
import type { Accord } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, ruPlural, tr } from '@/staff/i18n'

const HEX = /^#[0-9a-f]{6}$/i

/** Mijoz sahifasidagi akkord chizig'i ko'rinishi. */
function AccordBar({ color, label, width = 100 }: { color: string; label: string; width?: number }) {
  const valid = HEX.test(color)
  return (
    <div
      className="flex h-7 items-center justify-center truncate rounded px-2 text-xs font-semibold"
      style={{ width: `${width}%`, backgroundColor: valid ? color : '#cccccc', color: readableTextColor(valid ? color : '#cccccc') }}
    >
      {label}
    </div>
  )
}

function AccordModal({ accord, onClose }: { accord: Accord | null; onClose: () => void }) {
  const [name, setName] = useState(accord?.name ?? { ru: '', uz: '' })
  const [color, setColor] = useState(accord?.color ?? '#c4421f')

  const save = async () => {
    const errors: string[] = []
    if (!name.ru.trim() || !name.uz.trim()) errors.push(tr('Nomini ikkala tilda kiriting', 'Введите название на обоих языках'))
    if (!HEX.test(color)) errors.push(tr("Rang #rrggbb ko'rinishida bo'lsin", 'Цвет должен быть в формате #rrggbb'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const data = { name: { ru: name.ru.trim(), uz: name.uz.trim() }, color: color.toLowerCase() }
    if ((await commit(() => (accord ? http.put(`/accords/${accord.id}`, data) : http.post('/accords', data)))) === null) return
    showToast(accord ? tr('Saqlandi', 'Сохранено') : tr("Akkord qo'shildi", 'Аккорд добавлен'))
    onClose()
  }

  return (
    <Modal
      title={accord ? tr('Akkordni tahrirlash', 'Редактирование аккорда') : tr('Yangi akkord', 'Новый аккорд')}
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
        <LocalizedInput id="accord-name" label={tr('Nomi', 'Название')} value={name} onChange={setName} placeholder={{ ru: 'древесный', uz: "yog'ochli" }} />
        <Field
          label={tr('Rangi', 'Цвет')}
          htmlFor="accord-color"
          hint={tr('Matn rangi (oq / qora) fonga qarab avtomatik tanlanadi', 'Цвет текста (белый / чёрный) подбирается по фону автоматически')}
        >
          <div className="flex gap-2">
            <input
              type="color"
              aria-label={tr('Rang tanlash', 'Выбор цвета')}
              value={HEX.test(color) ? color : '#cccccc'}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded border border-neutral-300 bg-white p-1"
            />
            <input id="accord-color" value={color} onChange={(event) => setColor(event.target.value.trim())} className={`${inputClass} font-mono`} />
          </div>
        </Field>
        <div>
          <p className="mb-1 text-xs font-semibold text-neutral-600">{tr("Ko'rinishi", 'Как выглядит')}</p>
          <div className="space-y-1.5 rounded border border-neutral-200 p-3">
            <AccordBar color={color} label={name.ru || 'название'} />
            <AccordBar color={color} label={name.uz || 'nomi'} width={70} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Admin → Akkordlar: nomi (ru/uz) va rangi; mahsulot sahifasidagi rangli chiziqlar. */
export default function AccordsPage() {
  useDocumentTitle(tr('Akkordlar', 'Аккорды'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Accord | 'new' | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of db.products) for (const id of product.accords) counts.set(id, (counts.get(id) ?? 0) + 1)
    return counts
  }, [db.products])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...db.accords]
      .filter((accord) => !needle || `${accord.name.uz} ${accord.name.ru}`.toLowerCase().includes(needle))
      .sort((a, b) => loc(a.name).localeCompare(loc(b.name)))
  }, [db.accords, query])
  const { pageItems, pagination } = usePagination(filtered, query)

  const remove = async (accord: Accord) => {
    const used = usage.get(accord.id) ?? 0
    const name = loc(accord.name)
    if (used > 0) {
      return explainBlocked(
        tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        tr(
          `"${name}" akkordi ${used} ta atirda ishlatilgan. Avval atirlardan olib tashlang.`,
          `Аккорд «${name}» используется в ${used} ${ruPlural(used, 'аромате', 'ароматах', 'ароматах')}. Сначала уберите его из ароматов.`,
        ),
      )
    }
    if (!(await confirmDanger(tr("Akkordni o'chirish", 'Удаление аккорда'), tr(`"${name}" o'chiriladi.`, `«${name}» будет удалён.`)))) return
    if ((await commit(() => http.delete(`/accords/${accord.id}`))) === null) return
    showToast(tr("Akkord o'chirildi", 'Аккорд удалён'))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Akkordlar', 'Аккорды')}
        description={tr('Mahsulot sahifasidagi «Основные аккорды» chiziqlari', 'Полосы «Основные аккорды» на странице товара')}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi akkord', 'Новый аккорд')}
          </button>
        }
      />
      <Card>
        <div className="border-b border-neutral-200 p-4">
          <div className="sm:max-w-sm">
            <SearchInput value={query} onChange={setQuery} placeholder={tr('Akkord nomi', 'Название аккорда')} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Palette} title={tr('Akkord topilmadi', 'Аккорды не найдены')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={`${thClass} w-56`}>{tr("Ko'rinishi", 'Как выглядит')}</th>
                  <th className={thClass}>{tr("O'zbekcha", 'Узбекский')}</th>
                  <th className={thClass}>{tr('Ruscha', 'Русский')}</th>
                  <th className={thClass}>{tr('Rang', 'Цвет')}</th>
                  <th className={`${thClass} text-right`}>{tr('Atirlar', 'Ароматы')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((accord) => (
                  <tr key={accord.id} className="hover:bg-neutral-50">
                    <td className={tdClass}>
                      <div className="w-52">
                        <AccordBar color={accord.color} label={accord.name.ru} />
                      </div>
                    </td>
                    <td className={`${tdClass} font-semibold text-neutral-900`}>{accord.name.uz}</td>
                    <td className={`${tdClass} text-neutral-600`}>{accord.name.ru}</td>
                    <td className={`${tdClass} font-mono text-xs text-neutral-500`}>{accord.color}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(usage.get(accord.id) ?? 0)}</td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(accord)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(accord)}>
                          <Trash size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} />
      </Card>
      {editing && <AccordModal accord={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
