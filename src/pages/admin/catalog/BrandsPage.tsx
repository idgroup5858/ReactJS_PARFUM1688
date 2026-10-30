import { Pencil, Plus, Tag, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { http } from '@/api/http'
import { confirmDanger, explainBlocked, showErrors } from '@/components/admin/confirm'
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
import type { Brand } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { ruPlural, tr } from '@/staff/i18n'

function BrandModal({ brand, brands, onClose }: { brand: Brand | null; brands: Brand[]; onClose: () => void }) {
  const [name, setName] = useState(brand?.name ?? '')
  const [country, setCountry] = useState(brand?.country ?? '')

  const save = async () => {
    const trimmed = name.trim()
    const errors: string[] = []
    if (!trimmed) errors.push(tr('Brend nomini kiriting', 'Введите название бренда'))
    else if (brands.some((item) => item.id !== brand?.id && item.name.toLowerCase() === trimmed.toLowerCase()))
      errors.push(tr('Bunday brend allaqachon bor', 'Такой бренд уже есть'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    // id ("chanel") server nomdan yasaydi
    const data = { name: trimmed, country: country.trim() || undefined }
    if ((await commit(() => (brand ? http.put(`/brands/${brand.id}`, data) : http.post('/brands', data)))) === null) return
    showToast(brand ? tr('Saqlandi', 'Сохранено') : tr("Brend qo'shildi", 'Бренд добавлен'))
    onClose()
  }

  return (
    <Modal
      title={brand ? tr('Brendni tahrirlash', 'Редактирование бренда') : tr('Yangi brend', 'Новый бренд')}
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
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Field label={tr('Nomi', 'Название')} htmlFor="brand-name">
          <input
            id="brand-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={tr('Masalan: Chanel', 'Например: Chanel')}
            className={inputClass}
          />
        </Field>
        <Field label={tr('Davlati', 'Страна')} htmlFor="brand-country" hint={tr('Ixtiyoriy', 'Необязательно')}>
          <input
            id="brand-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder={tr('Fransiya', 'Франция')}
            className={inputClass}
          />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

/** Admin → Brendlar: ro'yxat, qidiruv, qo'shish / tahrirlash / o'chirish (atirlarda ishlatilmasa). */
export default function BrandsPage() {
  useDocumentTitle(tr('Brendlar', 'Бренды'))
  const db = useDb()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of db.products) counts.set(product.brandId, (counts.get(product.brandId) ?? 0) + 1)
    return counts
  }, [db.products])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return [...db.brands]
      .filter((brand) => !needle || `${brand.name} ${brand.country ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.brands, query])
  const { pageItems, pagination } = usePagination(filtered, query)

  const remove = async (brand: Brand) => {
    const used = usage.get(brand.id) ?? 0
    if (used > 0) {
      return explainBlocked(
        tr("O'chirib bo'lmaydi", 'Нельзя удалить'),
        tr(
          `"${brand.name}" brendiga ${used} ta atir bog'langan. Avval atirlarni boshqa brendga o'tkazing.`,
          `К бренду «${brand.name}» привязано ${used} ${ruPlural(used, 'аромат', 'аромата', 'ароматов')}. Сначала перенесите их на другой бренд.`,
        ),
      )
    }
    if (!(await confirmDanger(tr("Brendni o'chirish", 'Удаление бренда'), tr(`"${brand.name}" o'chiriladi.`, `«${brand.name}» будет удалён.`)))) return
    if ((await commit(() => http.delete(`/brands/${brand.id}`))) === null) return
    showToast(tr("Brend o'chirildi", 'Бренд удалён'))
  }

  const count = db.brands.length

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Brendlar', 'Бренды')}
        description={tr(`${formatNumber(count)} ta brend`, `${formatNumber(count)} ${ruPlural(count, 'бренд', 'бренда', 'брендов')}`)}
        actions={
          <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
            <Plus size={16} />
            {tr('Yangi brend', 'Новый бренд')}
          </button>
        }
      />
      <Card>
        <div className="border-b border-neutral-200 p-4">
          <div className="sm:max-w-sm">
            <SearchInput value={query} onChange={setQuery} placeholder={tr('Brend yoki davlat', 'Бренд или страна')} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Tag} title={tr('Brend topilmadi', 'Бренды не найдены')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Nomi', 'Название')}</th>
                  <th className={thClass}>{tr('Davlati', 'Страна')}</th>
                  <th className={`${thClass} text-right`}>{tr('Atirlar', 'Ароматы')}</th>
                  <th className={`${thClass} text-right`}>{tr('Amallar', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((brand) => (
                  <tr key={brand.id} className="hover:bg-neutral-50">
                    <td className={`${tdClass} font-semibold text-neutral-900`}>{brand.name}</td>
                    <td className={`${tdClass} text-neutral-600`}>{brand.country || '—'}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(usage.get(brand.id) ?? 0)}</td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(brand)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(brand)}>
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
      {editing && <BrandModal brand={editing === 'new' ? null : editing} brands={db.brands} onClose={() => setEditing(null)} />}
    </div>
  )
}
