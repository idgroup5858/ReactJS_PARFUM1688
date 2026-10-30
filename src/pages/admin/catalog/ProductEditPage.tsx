import { ArrowLeft, Save, SearchX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { http } from '@/api/http'
import { showErrors } from '@/components/admin/confirm'
import { ImageField } from '@/components/admin/ImagePicker'
import LocalizedInput from '@/components/admin/LocalizedInput'
import NumberInput from '@/components/admin/NumberInput'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass, selectClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import { GENDER_LABELS, GENDERS } from '@/domain/presets'
import { balanceOf, stockKey } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { formatMoney, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, tr } from '@/staff/i18n'
import AccordsEditor from './product/AccordsEditor'
import NotesEditor from './product/NotesEditor'
import TraitsCard from './product/TraitsCard'

const emptyProduct = (brandId: string): Product => ({
  id: '',
  name: '',
  brandId,
  categoryIds: [],
  gender: 'unisex',
  image: '',
  description: { ru: '', uz: '' },
  notes: { top: [], middle: [], base: [] },
  accords: [],
  season: 'universal',
  longevity: 'moderate',
  sillage: 'moderate',
  pricePerGram: 0,
  bottle: null,
  isNew: true,
  active: true,
  createdAt: '',
})

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-neutral-800">{label}</span>
        <span className="block text-xs text-neutral-500">{hint}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

/** Admin → Atirlar → yangi atir (/admin/products/new) yoki tahrirlash (/admin/products/:id). */
export default function ProductEditPage() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const existing = id ? db.products.find((product) => product.id === id) : undefined
  const isNew = !id

  // forma bir marta to'ldiriladi — boshqa ekrandagi o'zgarish (socket) yozilayotgan matnni o'chirmasin
  const [draft, setDraft] = useState<Product>(() => (existing ? structuredClone(existing) : emptyProduct(db.brands[0]?.id ?? '')))
  const [initial] = useState(() => JSON.stringify(draft))
  const dirty = JSON.stringify(draft) !== initial
  const saved = useRef(false)
  useDocumentTitle(isNew ? tr('Yangi atir', 'Новый аромат') : (existing?.name ?? tr('Atir', 'Аромат')))

  const patch = (value: Partial<Product>) => setDraft((current) => ({ ...current, ...value }))

  const families = useMemo(() => db.categories.filter((category) => category.group === 'family').sort((a, b) => a.sort - b.sort), [db.categories])
  const classes = useMemo(() => db.categories.filter((category) => category.group === 'class').sort((a, b) => a.sort - b.sort), [db.categories])
  const classIds = new Set(classes.map((category) => category.id))
  const selectedClass = draft.categoryIds.find((categoryId) => classIds.has(categoryId)) ?? ''

  const toggleFamily = (categoryId: string) =>
    patch({
      categoryIds: draft.categoryIds.includes(categoryId) ? draft.categoryIds.filter((item) => item !== categoryId) : [...draft.categoryIds, categoryId],
    })
  const setClass = (categoryId: string) =>
    patch({ categoryIds: [...draft.categoryIds.filter((item) => !classIds.has(item)), ...(categoryId ? [categoryId] : [])] })

  // saqlanmagan o'zgarishlar bilan boshqa sahifaga o'tishdan oldin so'raladi
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void AppSwal.fire({
      title: tr("Saqlanmagan o'zgarishlar", 'Несохранённые изменения'),
      text: tr("Formadagi o'zgarishlar saqlanmagan. Chiqib ketilsinmi?", 'Изменения в форме не сохранены. Всё равно выйти?'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: tr('Chiqish', 'Выйти'),
      cancelButtonText: tr('Qolish', 'Остаться'),
    }).then((result) => (result.isConfirmed ? blocker.proceed() : blocker.reset()))
  }, [blocker])

  if (id && !existing) {
    return (
      <EmptyState
        icon={SearchX}
        title={tr('Atir topilmadi', 'Аромат не найден')}
        message={id}
        action={
          <Link to="/admin/products" className={`btn-primary ${buttonClass}`}>
            {tr("Atirlar ro'yxati", 'Список ароматов')}
          </Link>
        }
      />
    )
  }

  const validate = (): string[] => {
    const errors: string[] = []
    const name = draft.name.trim()
    if (!name) errors.push(tr('Atir nomini kiriting', 'Введите название аромата'))
    else if (db.products.some((product) => product.id !== draft.id && product.name.trim().toLowerCase() === name.toLowerCase()))
      errors.push(tr('Bunday nomli atir allaqachon bor', 'Аромат с таким названием уже есть'))
    if (!db.brands.some((brand) => brand.id === draft.brandId)) errors.push(tr('Brendni tanlang', 'Выберите бренд'))
    if (!draft.categoryIds.some((categoryId) => families.some((family) => family.id === categoryId)))
      errors.push(tr('Kamida bitta aromat oilasini tanlang', 'Выберите хотя бы одно семейство ароматов'))
    if (draft.pricePerGram <= 0) errors.push(tr('1 gramm narxini kiriting', 'Введите цену за 1 грамм'))
    if (draft.bottle && (draft.bottle.volumeMl <= 0 || draft.bottle.price <= 0))
      errors.push(tr('Original flakon hajmi va narxini kiriting', 'Введите объём и цену оригинального флакона'))
    // mijoz ilovasi ikki tilli: bitta tilda yozilsa, ikkinchi tildagi «Описание» bo'sh yoki boshqa tilda chiqadi
    if (!draft.description.ru.trim() || !draft.description.uz.trim()) errors.push(tr('Tavsifni ikkala tilda yozing', 'Заполните описание на обоих языках'))
    return errors
  }

  const save = async () => {
    const errors = validate()
    if (errors.length > 0) {
      showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
      return
    }
    // id ("dior-sauvage") va createdAt — serverda
    const { id: productId, createdAt: _createdAt, ...data } = {
      ...draft,
      name: draft.name.trim(),
      description: { ru: draft.description.ru.trim(), uz: draft.description.uz.trim() },
    }
    if ((await commit(() => (isNew ? http.post('/products', data) : http.put(`/products/${productId}`, data)))) === null) return
    saved.current = true
    showToast(isNew ? tr("Atir qo'shildi", 'Аромат добавлен') : tr('Saqlandi', 'Сохранено'))
    navigate('/admin/products')
  }

  const grams = existing ? balanceOf(db, stockKey('gram', existing.id)).qty : 0
  const bottles = existing?.bottle ? balanceOf(db, stockKey('bottle', existing.id)).qty : 0
  const minGrams = db.settings.minGrams

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? tr('Yangi atir', 'Новый аромат') : tr('Atirni tahrirlash', 'Редактирование аромата')}
        description={isNew ? tr("Atir ma'lumotlari, rasmi, notalari va xususiyatlari", 'Данные аромата, фото, ноты и характеристики') : existing?.name}
        actions={
          <>
            <Link to="/admin/products" className={`btn-ghost ${buttonClass}`}>
              <ArrowLeft size={16} />
              {tr("Ro'yxat", 'Список')}
            </Link>
            <button type="button" onClick={() => void save()} className={`btn-primary ${buttonClass}`}>
              <Save size={16} />
              {tr('Saqlash', 'Сохранить')}
            </button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title={tr('Asosiy', 'Основное')} />
            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={tr('Nomi', 'Название')}
                  htmlFor="product-name"
                  hint={tr("Mijoz ilovasida ikkala tilda shunday ko'rinadi", 'В приложении клиента так выглядит на обоих языках')}
                >
                  <input
                    id="product-name"
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                    placeholder={tr('Masalan: Dior Sauvage', 'Например: Dior Sauvage')}
                    className={inputClass}
                  />
                </Field>
                <Field label={tr('Brend', 'Бренд')} htmlFor="product-brand">
                  <select id="product-brand" value={draft.brandId} onChange={(event) => patch({ brandId: event.target.value })} className={selectClass}>
                    {!draft.brandId && <option value="">{tr('— tanlang —', '— выберите —')}</option>}
                    {[...db.brands]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-600">{tr('Aromat oilalari', 'Семейства ароматов')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {families.map((category) => {
                    const active = draft.categoryIds.includes(category.id)
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleFamily(category.id)}
                        className={`h-8 cursor-pointer rounded border px-3 text-xs font-semibold transition-colors ${active ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'}`}
                      >
                        {loc(category.name)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr('Sinf', 'Класс')} htmlFor="product-class" hint={tr("PREMIUM, TOP... — nom yonida ko'rsatiladi", 'PREMIUM, TOP... — показывается рядом с названием')}>
                  <select id="product-class" value={selectedClass} onChange={(event) => setClass(event.target.value)} className={selectClass}>
                    <option value="">{tr("Yo'q", 'Нет')}</option>
                    {classes.map((category) => (
                      <option key={category.id} value={category.id}>
                        {loc(category.name)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-neutral-600">{tr('Jinsi', 'Пол')}</p>
                  <SegmentedControl
                    label={tr('Jinsi', 'Пол')}
                    value={draft.gender}
                    onChange={(gender) => patch({ gender })}
                    options={GENDERS.map((gender) => ({ value: gender, label: loc(GENDER_LABELS[gender]) }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
                <SwitchRow
                  label={tr('Yangi', 'Новинка')}
                  hint={tr("«Новинки» bo'limi va NOVINKA belgisi", 'Раздел «Новинки» и значок «Новинка»')}
                  checked={draft.isNew}
                  onChange={(isNew) => patch({ isNew })}
                />
                <SwitchRow
                  label={tr('Faol', 'Активен')}
                  hint={tr("O'chirilsa mijoz ilovasida ko'rinmaydi", 'Если выключить, не виден в приложении клиента')}
                  checked={draft.active}
                  onChange={(active) => patch({ active })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={tr('Tavsif', 'Описание')} hint={tr("Mijoz ilovasidagi «Описание» bo'limi — ikkala tilda", 'Раздел «Описание» в приложении клиента — на обоих языках')} />
            <div className="p-4">
              <LocalizedInput
                id="product-description"
                label={tr('Tavsif', 'Описание')}
                multiline
                rows={4}
                value={draft.description}
                onChange={(description) => patch({ description })}
                placeholder={{ ru: 'Описание аромата…', uz: 'Atir haqida…' }}
              />
            </div>
          </Card>

          <NotesEditor value={draft.notes} notes={db.notes} onChange={(notes) => patch({ notes })} />
          <AccordsEditor value={draft.accords} accords={db.accords} onChange={(accords) => patch({ accords })} />
          <TraitsCard
            season={draft.season}
            longevity={draft.longevity}
            sillage={draft.sillage}
            gender={draft.gender}
            onChange={(value) => patch(value)}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader title={tr('Rasm', 'Фото')} hint={tr('Serverdagi perfumes papkasidan', 'Из папки perfumes на сервере')} />
            <div className="p-4">
              <ImageField folder="perfumes" variant="large" value={draft.image} onChange={(image) => patch({ image })} />
            </div>
          </Card>

          <Card>
            <CardHeader title={tr('Narx', 'Цена')} />
            <div className="space-y-4 p-4">
              <Field
                label={tr('Razliv — 1 gramm narxi', 'Розлив — цена за 1 грамм')}
                htmlFor="product-price"
                hint={
                  draft.pricePerGram > 0
                    ? tr(`${minGrams} g (eng kam) — ${formatMoney(draft.pricePerGram * minGrams)}`, `${minGrams} г (минимум) — ${formatMoney(draft.pricePerGram * minGrams)}`)
                    : undefined
                }
              >
                <NumberInput id="product-price" value={draft.pricePerGram} onChange={(pricePerGram) => patch({ pricePerGram })} suffix={tr("so'm", 'сум')} />
              </Field>
              <SwitchRow
                label={tr('Original flakon', 'Оригинальный флакон')}
                hint={tr('Ochilmagan flakon dona hisobida sotiladi', 'Запечатанный флакон продаётся поштучно')}
                checked={draft.bottle !== null}
                onChange={(on) => patch({ bottle: on ? { volumeMl: 100, price: 0 } : null })}
              />
              {draft.bottle && (
                <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
                  <Field label={tr('Hajmi', 'Объём')} htmlFor="bottle-volume">
                    <NumberInput
                      id="bottle-volume"
                      value={draft.bottle.volumeMl}
                      onChange={(volumeMl) => patch({ bottle: { price: draft.bottle?.price ?? 0, volumeMl } })}
                      suffix={tr('ml', 'мл')}
                    />
                  </Field>
                  <Field label={tr('Narxi', 'Цена')} htmlFor="bottle-price">
                    <NumberInput
                      id="bottle-price"
                      value={draft.bottle.price}
                      onChange={(price) => patch({ bottle: { volumeMl: draft.bottle?.volumeMl ?? 0, price } })}
                      suffix={tr("so'm", 'сум')}
                    />
                  </Field>
                </div>
              )}
            </div>
          </Card>

          {existing && (
            <Card>
              <CardHeader
                title={tr('Ombordagi qoldiq', 'Остаток на складе')}
                actions={
                  <Link to="/admin/stock" className="text-xs font-semibold text-brand-700 hover:underline">
                    {tr('Qoldiqlar', 'Остатки')}
                  </Link>
                }
              />
              <dl className="divide-y divide-neutral-100 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-neutral-500">{tr('Razliv', 'Розлив')}</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatNumber(grams)} {tr('g', 'г')}
                  </dd>
                </div>
                {existing.bottle && (
                  <div className="flex justify-between px-4 py-2.5">
                    <dt className="text-neutral-500">{tr('Original flakon', 'Оригинальный флакон')}</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatNumber(bottles)} {tr('dona', 'шт.')}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="border-t border-neutral-200 px-4 py-2.5 text-xs text-neutral-500">
                {tr("Qoldiq faqat Prixod, Inventarizatsiya va Spisanie orqali o'zgaradi.", 'Остаток меняется только через Приход, Инвентаризацию и Списание.')}
              </p>
            </Card>
          )}

          <button type="button" onClick={() => void save()} className={`btn-primary ${buttonClass} w-full`}>
            <Save size={16} />
            {isNew ? tr("Atirni qo'shish", 'Добавить аромат') : tr("O'zgarishlarni saqlash", 'Сохранить изменения')}
          </button>
        </div>
      </div>
    </div>
  )
}
