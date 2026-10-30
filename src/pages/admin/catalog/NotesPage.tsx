import { Flower2, Pencil, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { confirmDanger, explainBlocked, showErrors } from '@/components/admin/confirm'
import { ImageField } from '@/components/admin/ImagePicker'
import LocalizedInput from '@/components/admin/LocalizedInput'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import { buttonClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import type { Note } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, ruPlural, staffLang, tr } from '@/staff/i18n'

function NoteModal({ note, notes, onClose }: { note: Note | null; notes: Note[]; onClose: () => void }) {
  const [name, setName] = useState(note?.name ?? { ru: '', uz: '' })
  const [image, setImage] = useState(note?.image ?? '')

  const save = async () => {
    const errors: string[] = []
    if (!name.ru.trim() || !name.uz.trim()) errors.push(tr('Nomini ikkala tilda kiriting', 'Введите название на обоих языках'))
    else if (notes.some((item) => item.id !== note?.id && item.name.uz.toLowerCase() === name.uz.trim().toLowerCase()))
      errors.push(tr('Bunday nota allaqachon bor', 'Такая нота уже есть'))
    if (!image) errors.push(tr("Rasm tanlang — nota mijoz sahifasida rasm bilan ko'rinadi", 'Выберите фото — нота показывается клиенту с картинкой'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const data = { name: { ru: name.ru.trim(), uz: name.uz.trim() }, image }
    if ((await commit(() => (note ? http.put(`/notes/${note.id}`, data) : http.post('/notes', data)))) === null) return
    showToast(note ? tr('Saqlandi', 'Сохранено') : tr("Nota qo'shildi", 'Нота добавлена'))
    onClose()
  }

  return (
    <Modal
      title={note ? tr('Notani tahrirlash', 'Редактирование ноты') : tr('Yangi nota', 'Новая нота')}
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
        <LocalizedInput id="note-name" label={tr('Nomi', 'Название')} value={name} onChange={setName} placeholder={{ ru: 'Бергамот', uz: 'Bergamot' }} />
        <Field label={tr('Rasm', 'Фото')}>
          <ImageField folder="notes" value={image} onChange={setImage} />
        </Field>
      </div>
    </Modal>
  )
}

/** Admin → Notalar: rasmli to'r; atir formasida shu ro'yxatdan tanlanadi. */
export default function NotesPage() {
  useDocumentTitle(tr('Notalar', 'Ноты'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | 'new' | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of db.products) {
      for (const id of new Set([...product.notes.top, ...product.notes.middle, ...product.notes.base])) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [db.products])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...db.notes]
      .filter((note) => !needle || `${note.name.uz} ${note.name.ru}`.toLowerCase().includes(needle))
      .sort((a, b) => loc(a.name).localeCompare(loc(b.name)))
  }, [db.notes, query])
  const { pageItems, pagination } = usePagination(filtered, query, 24)

  const remove = async (note: Note) => {
    const used = usage.get(note.id) ?? 0
    const name = loc(note.name)
    if (used > 0) {
      return explainBlocked(
        tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        tr(
          `"${name}" notasi ${used} ta atirda ishlatilgan. Avval atirlardan olib tashlang.`,
          `Нота «${name}» используется в ${used} ${ruPlural(used, 'аромате', 'ароматах', 'ароматах')}. Сначала уберите её из ароматов.`,
        ),
      )
    }
    if (!(await confirmDanger(tr("Notani o'chirish", 'Удаление ноты'), tr(`"${name}" o'chiriladi.`, `«${name}» будет удалена.`)))) return
    if ((await commit(() => http.delete(`/notes/${note.id}`))) === null) return
    showToast(tr("Nota o'chirildi", 'Нота удалена'))
  }

  const count = db.notes.length

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Notalar', 'Ноты')}
        description={tr(
          `${formatNumber(count)} ta nota — atirlarda yuqori, o'rta va baza notalar sifatida tanlanadi`,
          `${formatNumber(count)} ${ruPlural(count, 'нота', 'ноты', 'нот')} — в ароматах выбираются как верхние, средние и базовые ноты`,
        )}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi nota', 'Новая нота')}
          </button>
        }
      />
      <Card>
        <div className="border-b border-neutral-200 p-4">
          <div className="sm:max-w-sm">
            <SearchInput value={query} onChange={setQuery} placeholder={tr("Nota nomi (o'zbekcha yoki ruscha)", 'Название ноты (на узбекском или русском)')} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Flower2} title={tr('Nota topilmadi', 'Ноты не найдены')} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {pageItems.map((note) => {
              const used = usage.get(note.id) ?? 0
              return (
                <div key={note.id} className="group overflow-hidden rounded border border-neutral-200 bg-white">
                  <button type="button" onClick={() => setEditing(note)} className="block w-full cursor-pointer" title={tr('Tahrirlash', 'Редактировать')}>
                    <Img path={note.image} alt={loc(note.name)} className="aspect-square w-full" />
                  </button>
                  <div className="flex items-start gap-1 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">{loc(note.name)}</p>
                      <p className="truncate text-xs text-neutral-500">{staffLang() === 'ru' ? note.name.uz : note.name.ru}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-400 tabular-nums">
                        {tr(`${formatNumber(used)} ta atirda`, `в ${formatNumber(used)} ${ruPlural(used, 'аромате', 'ароматах', 'ароматах')}`)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(note)}>
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(note)}>
                        <Trash size={14} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <Pagination {...pagination} />
      </Card>
      {editing && <NoteModal note={editing === 'new' ? null : editing} notes={db.notes} onClose={() => setEditing(null)} />}
    </div>
  )
}
