import { Pencil, Plus, Shapes, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import Badge from '@/components/admin/Badge'
import { confirmDanger, explainBlocked, showErrors } from '@/components/admin/confirm'
import { ImageField } from '@/components/admin/ImagePicker'
import LocalizedInput from '@/components/admin/LocalizedInput'
import NumberInput from '@/components/admin/NumberInput'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { buttonClass, tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { commit, useDb } from '@/data/db'
import { CATEGORY_GROUP_LABEL } from '@/domain/labels'
import type { Category, CategoryGroup } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, ruPlural, staffLang, tr } from '@/staff/i18n'

const GROUPS: CategoryGroup[] = ['family', 'class']

/** "N ta atir" / "N аромат(а/ов)" */
const perfumes = (n: number) => tr(`${n} ta atir`, `${n} ${ruPlural(n, 'аромат', 'аромата', 'ароматов')}`)

type ModalProps = {
  category: Category | null
  categories: Category[]
  /** shu kategoriyadagi atirlar soni */
  used: number
  onClose: () => void
}

function CategoryModal({ category, categories, used, onClose }: ModalProps) {
  const [name, setName] = useState(category?.name ?? { ru: '', uz: '' })
  const [group, setGroup] = useState<CategoryGroup>(category?.group ?? 'family')
  const [image, setImage] = useState(category?.image ?? '')
  const [sort, setSort] = useState(category?.sort ?? Math.max(0, ...categories.map((item) => item.sort)) + 1)
  // ishlatilayotgan oila sinfga aylansa, atirlar oilasiz qoladi (bosh sahifadan yo'qoladi) va nomi yonida sinf bo'lib chiqadi
  const groupLocked = category !== null && used > 0

  const save = async () => {
    const errors: string[] = []
    if (!name.ru.trim() || !name.uz.trim()) errors.push(tr('Nomini ikkala tilda kiriting', 'Введите название на обоих языках'))
    if (groupLocked && group !== category.group)
      errors.push(
        tr(
          `Bu kategoriyada ${used} ta atir bor — turini o'zgartirib bo'lmaydi. Avval atirlardan olib tashlang.`,
          `В этой категории ${perfumes(used)} — тип изменить нельзя. Сначала уберите её у ароматов.`,
        ),
      )
    if (group === 'family' && !image)
      errors.push(tr("Aromat oilasi uchun rasm tanlang (bosh sahifada ko'rinadi)", 'Выберите фото для семейства ароматов (видно на главной)'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const data = { name: { ru: name.ru.trim(), uz: name.uz.trim() }, group, image, sort }
    if ((await commit(() => (category ? http.put(`/categories/${category.id}`, data) : http.post('/categories', data)))) === null) return
    showToast(category ? tr('Saqlandi', 'Сохранено') : tr("Kategoriya qo'shildi", 'Категория добавлена'))
    onClose()
  }

  return (
    <Modal
      title={category ? tr('Kategoriyani tahrirlash', 'Редактирование категории') : tr('Yangi kategoriya', 'Новая категория')}
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
        <LocalizedInput id="category-name" label={tr('Nomi', 'Название')} value={name} onChange={setName} placeholder={{ ru: 'Цветочные', uz: 'Gulli' }} />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600">{tr('Turi', 'Тип')}</p>
            <SegmentedControl
              label={tr('Turi', 'Тип')}
              value={group}
              onChange={setGroup}
              options={GROUPS.map((item) => ({ value: item, label: CATEGORY_GROUP_LABEL[item] }))}
            />
            <p className="mt-1 text-xs text-neutral-500">
              {group === 'family'
                ? tr('Bosh sahifadagi rasmli kategoriyalar (Цветочные, Древесные…)', 'Категории с фото на главной (Цветочные, Древесные…)')
                : tr('Atir nomi yonidagi sinf (PREMIUM, TOP…)', 'Класс рядом с названием аромата (PREMIUM, TOP…)')}
            </p>
            {groupLocked && (
              <p className={`mt-1 text-xs ${group === category.group ? 'text-neutral-500' : 'font-semibold text-amber-700'}`}>
                {tr(
                  `${used} ta atirda ishlatilgan — turini o'zgartirib bo'lmaydi`,
                  `Используется у ${used} ${ruPlural(used, 'аромата', 'ароматов', 'ароматов')} — тип изменить нельзя`,
                )}
              </p>
            )}
          </div>
          <Field label={tr('Tartib', 'Порядок')} htmlFor="category-sort">
            <NumberInput id="category-sort" value={sort} onChange={setSort} />
          </Field>
        </div>
        <Field label={tr('Rasm', 'Фото')}>
          <ImageField folder="categories" value={image} onChange={setImage} />
        </Field>
      </div>
    </Modal>
  )
}

/** Admin → Kategoriyalar: aromat oilalari (rasmli) va sinflar (PREMIUM, TOP). */
export default function CategoriesPage() {
  useDocumentTitle(tr('Kategoriyalar', 'Категории'))
  const db = useDb()
  const [group, setGroup] = useState<CategoryGroup | 'all'>('all')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of db.products) for (const id of product.categoryIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    return counts
  }, [db.products])

  const filtered = useMemo(
    () => db.categories.filter((category) => group === 'all' || category.group === group).sort((a, b) => a.sort - b.sort),
    [db.categories, group],
  )
  const { pageItems, pagination } = usePagination(filtered, group)

  const remove = async (category: Category) => {
    const used = usage.get(category.id) ?? 0
    const name = loc(category.name)
    if (used > 0) {
      return explainBlocked(
        tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        tr(`"${name}" kategoriyasida ${used} ta atir bor. Avval atirlardan olib tashlang.`, `В категории «${name}» ${perfumes(used)}. Сначала уберите её у ароматов.`),
      )
    }
    if (!(await confirmDanger(tr("Kategoriyani o'chirish", 'Удаление категории'), tr(`"${name}" o'chiriladi.`, `«${name}» будет удалена.`)))) return
    if ((await commit(() => http.delete(`/categories/${category.id}`))) === null) return
    showToast(tr("Kategoriya o'chirildi", 'Категория удалена'))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Kategoriyalar', 'Категории')}
        description={tr("Aromat oilalari mijoz ilovasining bosh sahifasida rasm bilan ko'rinadi", 'Семейства ароматов видны с фото на главной странице приложения клиента')}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi kategoriya', 'Новая категория')}
          </button>
        }
      />
      <Card>
        <div className="border-b border-neutral-200 p-4">
          <SegmentedControl
            label={tr('Turi', 'Тип')}
            value={group}
            onChange={setGroup}
            options={[{ value: 'all', label: tr('Hammasi', 'Все') }, ...GROUPS.map((item) => ({ value: item, label: CATEGORY_GROUP_LABEL[item] }))]}
          />
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Shapes} title={tr("Kategoriya yo'q", 'Категорий нет')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Kategoriya', 'Категория')}</th>
                  {/* ikkinchi tildagi nomi: o'zbekcha interfeysda — ruschasi, ruscha interfeysda — o'zbekchasi */}
                  <th className={thClass}>{tr('Ruscha', 'По-узбекски')}</th>
                  <th className={thClass}>{tr('Turi', 'Тип')}</th>
                  <th className={`${thClass} text-right`}>{tr('Tartib', 'Порядок')}</th>
                  <th className={`${thClass} text-right`}>{tr('Atirlar', 'Ароматы')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((category) => (
                  <tr key={category.id} className="hover:bg-neutral-50">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Img path={category.image} alt={loc(category.name)} className="h-10 w-14 shrink-0 rounded" />
                        <span className="font-semibold text-neutral-900">{loc(category.name)}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-neutral-600`}>{staffLang() === 'ru' ? category.name.uz : category.name.ru}</td>
                    <td className={tdClass}>
                      <Badge tone={category.group === 'family' ? 'info' : 'brand'}>{CATEGORY_GROUP_LABEL[category.group]}</Badge>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{category.sort}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(usage.get(category.id) ?? 0)}</td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(category)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(category)}>
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
      {editing && (
        <CategoryModal
          category={editing === 'new' ? null : editing}
          categories={db.categories}
          used={editing === 'new' ? 0 : (usage.get(editing.id) ?? 0)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
