import { Check, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import SearchInput from '@/components/ui/SearchInput'
import { buttonClass } from '@/components/ui/styles'
import type { ID, Localized, Note, Product } from '@/domain/types'
import { loc, staffLang, tr } from '@/staff/i18n'

export type NoteLevel = keyof Product['notes']

const levels = (): { id: NoteLevel; title: string; hint: string }[] => [
  { id: 'top', title: tr('Yuqori notalar', 'Верхние ноты'), hint: tr('Birinchi daqiqalarda seziladi (Верхние ноты)', 'Чувствуются в первые минуты') },
  { id: 'middle', title: tr("O'rta notalar", 'Средние ноты'), hint: tr('Atirning "yuragi" (Средние ноты)', '«Сердце» аромата') },
  { id: 'base', title: tr('Baza notalar', 'Базовые ноты'), hint: tr('Eng uzoq qoladigan iz (Базовые ноты)', 'Самый долгий след') },
]

/** Nomning ikkinchi tildagisi — tanlash oynasida asosiy nom ostida kichik yoziladi. */
const otherName = (name: Localized) => (staffLang() === 'ru' ? name.uz : name.ru)

type PickerProps = {
  title: string
  notes: Note[]
  selected: ID[]
  /** boshqa darajalarda tanlangan notalar — belgi bilan ko'rsatiladi */
  elsewhere: Set<ID>
  onDone: (ids: ID[]) => void
  onClose: () => void
}

/** Ma'lumotnomadan notalarni tanlash: rasmli to'r, qidiruv, bir nechtasini belgilash. */
function NotePickerModal({ title, notes, selected: initial, elsewhere, onDone, onClose }: PickerProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ID[]>(initial)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...notes]
      .sort((a, b) => loc(a.name).localeCompare(loc(b.name)))
      .filter((note) => !needle || `${note.name.uz} ${note.name.ru}`.toLowerCase().includes(needle))
  }, [notes, query])
  const toggle = (id: ID) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  return (
    <Modal
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`btn-ghost ${buttonClass} flex-1`}>
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone(selected)
              onClose()
            }}
            className={`btn-primary ${buttonClass} flex-1`}
          >
            <Check size={16} />
            {tr('Tayyor', 'Готово')} ({selected.length})
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder={tr("Nota nomi (o'zbekcha yoki ruscha)", 'Название ноты (на узбекском или русском)')} autoFocus />
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            {tr("Nota topilmadi — avval Admin → Notalar bo'limida qo'shing", 'Ноты не найдены — сначала добавьте их в Админ → Ноты')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {visible.map((note) => {
              const active = selected.includes(note.id)
              return (
                <button
                  key={note.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(note.id)}
                  className={`relative flex cursor-pointer flex-col items-center gap-1 rounded border p-2 text-center transition-colors ${active ? 'border-brand-700 bg-brand-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                >
                  <Img path={note.image} alt={loc(note.name)} className="h-14 w-14 rounded" />
                  <span className={`w-full truncate text-xs ${active ? 'font-semibold text-brand-700' : 'text-neutral-700'}`}>{loc(note.name)}</span>
                  <span className="w-full truncate text-[10px] text-neutral-400">{otherName(note.name)}</span>
                  {active && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  {!active && elsewhere.has(note.id) && (
                    <span className="absolute top-1 left-1 rounded bg-neutral-100 px-1 text-[9px] font-semibold text-neutral-500">{tr('boshqa', 'другой')}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

type Props = {
  value: Product['notes']
  notes: Note[]
  onChange: (value: Product['notes']) => void
}

/** Atir piramidasi: uchta darajadagi notalar (rasmli chiplar), ma'lumotnomadan tanlanadi. */
export default function NotesEditor({ value, notes, onChange }: Props) {
  const [picking, setPicking] = useState<NoteLevel | null>(null)
  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])
  const noteLevels = levels()
  const pickingLevel = noteLevels.find((level) => level.id === picking)

  return (
    <Card>
      <CardHeader title={tr('Notalar', 'Ноты')} hint={tr("Notalar ma'lumotnomadan tanlanadi (rasmi bilan)", 'Ноты выбираются из справочника (с картинкой)')} />
      <div className="divide-y divide-neutral-200">
        {noteLevels.map((level) => (
          <div key={level.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900">{level.title}</h3>
                <p className="text-xs text-neutral-500">{level.hint}</p>
              </div>
              <button type="button" onClick={() => setPicking(level.id)} className={`btn-outline ${buttonClass} h-8 shrink-0 px-3 text-xs`}>
                <Plus size={14} />
                {tr('Tanlash', 'Выбрать')}
              </button>
            </div>
            {value[level.id].length === 0 ? (
              <p className="text-xs text-neutral-400">{tr('Nota tanlanmagan', 'Ноты не выбраны')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {value[level.id].map((id) => {
                  const note = byId.get(id)
                  const name = note ? loc(note.name) : id
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-white py-0.5 pr-0.5 pl-0.5 text-xs">
                      <Img path={note?.image} alt={name} className="h-6 w-6 rounded-[2px]" />
                      <span className="font-medium text-neutral-800">{name}</span>
                      <button
                        type="button"
                        aria-label={tr(`${name} ni olib tashlash`, `Убрать ${name}`)}
                        title={tr('Olib tashlash', 'Убрать')}
                        onClick={() => onChange({ ...value, [level.id]: value[level.id].filter((item) => item !== id) })}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-700"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      {pickingLevel && (
        <NotePickerModal
          title={pickingLevel.title}
          notes={notes}
          selected={value[pickingLevel.id]}
          elsewhere={new Set(noteLevels.filter((level) => level.id !== pickingLevel.id).flatMap((level) => value[level.id]))}
          onDone={(ids) => onChange({ ...value, [pickingLevel.id]: ids })}
          onClose={() => setPicking(null)}
        />
      )}
    </Card>
  )
}
