import { ArrowRight, GalleryHorizontal, Pencil, Plus, Trash } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { http } from '@/api/http'
import Badge from '@/components/admin/Badge'
import { confirmDanger, showErrors } from '@/components/admin/confirm'
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
import SegmentedControl from '@/components/ui/SegmentedControl'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass } from '@/components/ui/styles'
import { commit, useDb } from '@/data/db'
import type { Banner, Lang, Localized } from '@/domain/types'
import { showToast } from '@/lib/toast'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { loc, tr } from '@/staff/i18n'
import { accentVars, findAccent } from '@/theme/accents'

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ru', label: 'RU' },
  { value: 'uz', label: 'UZ' },
]

const linkPresets = () => [
  { link: '/catalog', label: tr('Katalog', 'Каталог') },
  { link: '/catalog?filter=new', label: tr('Yangilar', 'Новинки') },
  { link: '/catalog?filter=bottle', label: tr('Original flakonlar', 'Оригинальные флаконы') },
  { link: '/categories', label: tr('Kategoriyalar', 'Категории') },
]

type BannerContent = Pick<Banner, 'title' | 'subtitle' | 'button' | 'image'>

const trimmed = (value: Localized): Localized => ({ ru: value.ru.trim(), uz: value.uz.trim() })
/** Ixtiyoriy matn: ikkala tilda yoziladi yoki ikkalasi ham bo'sh qoladi (bittasida bo'lsa, ikkinchi til mijozi noto'g'ri tilni yoki bo'shliqni ko'radi). */
const halfFilled = (value: Localized) => Boolean(value.ru.trim()) !== Boolean(value.uz.trim())

/**
 * Mijoz ilovasi bosh sahifasidagi karusel slaydi ko'rinishi (taxminiy). Rang — mijoz ilovasi rangi
 * (Sozlamalar → "Mijoz ilovasi rangi"), xodimning shu qurilmadagi asosiy rangi emas.
 */
function BannerPreview({ banner, lang }: { banner: BannerContent; lang: Lang }) {
  const accent = findAccent(useDb().settings.customerAccentId)
  return (
    <div
      data-accent={accent.id}
      style={accentVars(accent) as CSSProperties}
      className="bg-hero relative flex aspect-[16/7] w-full overflow-hidden rounded"
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
        <p className="font-serif text-xl leading-tight font-semibold tracking-wide uppercase sm:text-2xl">{banner.title[lang] || '—'}</p>
        <p className="line-clamp-2 max-w-xs text-xs text-white/85 sm:text-sm">{banner.subtitle[lang]}</p>
        {banner.button[lang] && (
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded bg-black/25 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
            {banner.button[lang]}
            <ArrowRight size={13} />
          </span>
        )}
      </div>
      <div className="flex w-[38%] shrink-0 items-end justify-center p-2">
        <Img path={banner.image} alt="" fit="contain" className="h-full w-full bg-transparent! text-white/40!" />
      </div>
    </div>
  )
}

function BannerModal({ banner, nextSort, onClose }: { banner: Banner | null; nextSort: number; onClose: () => void }) {
  const [draft, setDraft] = useState<Banner>(
    () =>
      banner ?? {
        id: '',
        title: { ru: '', uz: '' },
        subtitle: { ru: '', uz: '' },
        button: { ru: '', uz: '' },
        link: '/catalog',
        image: '',
        active: true,
        sort: nextSort,
      },
  )
  const [lang, setLang] = useState<Lang>('ru')
  const patch = (value: Partial<Banner>) => setDraft((current) => ({ ...current, ...value }))

  const save = async () => {
    const errors: string[] = []
    if (!draft.title.ru.trim() || !draft.title.uz.trim()) errors.push(tr('Sarlavhani ikkala tilda kiriting', 'Введите заголовок на обоих языках'))
    if (halfFilled(draft.subtitle))
      errors.push(tr("Matnni ikkala tilda kiriting yoki ikkalasini bo'sh qoldiring", 'Заполните текст на обоих языках или оставьте оба пустыми'))
    if (halfFilled(draft.button))
      errors.push(tr("Tugma matnini ikkala tilda kiriting yoki ikkalasini bo'sh qoldiring", 'Заполните текст кнопки на обоих языках или оставьте оба пустыми'))
    if (!draft.link.startsWith('/')) errors.push(tr('Havola "/" bilan boshlansin (masalan /catalog)', 'Ссылка должна начинаться с «/» (например, /catalog)'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    const { id: _id, ...data } = { ...draft, title: trimmed(draft.title), subtitle: trimmed(draft.subtitle), button: trimmed(draft.button) }
    if ((await commit(() => (banner ? http.put(`/banners/${banner.id}`, data) : http.post('/banners', data)))) === null) return
    showToast(banner ? tr('Saqlandi', 'Сохранено') : tr("Banner qo'shildi", 'Баннер добавлен'))
    onClose()
  }

  return (
    <Modal
      title={banner ? tr('Bannerni tahrirlash', 'Редактирование баннера') : tr('Yangi banner', 'Новый баннер')}
      size="lg"
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
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-neutral-600">{tr("Ko'rinishi", 'Как выглядит')}</p>
            <SegmentedControl label={tr('Til', 'Язык')} value={lang} onChange={setLang} options={LANG_OPTIONS} />
          </div>
          <BannerPreview banner={draft} lang={lang} />
        </div>
        <LocalizedInput
          id="banner-title"
          label={tr('Sarlavha', 'Заголовок')}
          value={draft.title}
          onChange={(title) => patch({ title })}
          placeholder={{ ru: 'Новые ароматы', uz: 'Yangi atirlar' }}
        />
        <LocalizedInput id="banner-subtitle" label={tr('Matn', 'Текст')} multiline rows={2} value={draft.subtitle} onChange={(subtitle) => patch({ subtitle })} />
        <LocalizedInput
          id="banner-button"
          label={tr('Tugma matni', 'Текст кнопки')}
          value={draft.button}
          onChange={(button) => patch({ button })}
          placeholder={{ ru: 'Смотреть', uz: "Ko'rish" }}
        />
        <Field
          label={tr('Havola', 'Ссылка')}
          htmlFor="banner-link"
          hint={tr('Tugma bosilganda ochiladigan sahifa: /catalog, /product/<atir-id>…', 'Страница, которая откроется по кнопке: /catalog, /product/<id-аромата>…')}
        >
          <input id="banner-link" value={draft.link} onChange={(event) => patch({ link: event.target.value.trim() })} className={`${inputClass} font-mono`} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {linkPresets().map((preset) => (
              <button
                key={preset.link}
                type="button"
                onClick={() => patch({ link: preset.link })}
                className={`cursor-pointer rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors ${draft.link === preset.link ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={tr('Rasm', 'Фото')} hint={tr("Shaffof fonli PNG (flakonlar) yaxshi ko'rinadi", 'Лучше всего смотрится PNG с прозрачным фоном (флаконы)')}>
          <ImageField folder="banners" value={draft.image} onChange={(image) => patch({ image })} />
        </Field>
        <div className="grid items-end gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
          <Field label={tr('Tartib', 'Порядок')} htmlFor="banner-sort">
            <NumberInput id="banner-sort" value={draft.sort} onChange={(sort) => patch({ sort })} />
          </Field>
          <div className="flex h-10 items-center gap-3">
            <span className="flex-1 text-sm text-neutral-800">{tr("Mijozlarga ko'rsatilsin", 'Показывать клиентам')}</span>
            <Switch checked={draft.active} onChange={(active) => patch({ active })} label={tr('Faol', 'Активен')} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Admin → Bannerlar: mijoz ilovasi bosh sahifasidagi karusel slaydlari. */
export default function BannersPage() {
  useDocumentTitle(tr('Bannerlar', 'Баннеры'))
  const db = useDb()
  const [lang, setLang] = useState<Lang>('ru')
  const [editing, setEditing] = useState<Banner | 'new' | null>(null)
  const banners = [...db.banners].sort((a, b) => a.sort - b.sort)

  const toggle = (banner: Banner) => commit(() => http.patch(`/banners/${banner.id}/active`, { active: !banner.active }))

  const remove = async (banner: Banner) => {
    const title = loc(banner.title)
    if (!(await confirmDanger(tr("Bannerni o'chirish", 'Удаление баннера'), tr(`"${title}" o'chiriladi.`, `«${title}» будет удалён.`)))) return
    if ((await commit(() => http.delete(`/banners/${banner.id}`))) === null) return
    showToast(tr("Banner o'chirildi", 'Баннер удалён'))
  }

  const activeCount = banners.filter((banner) => banner.active).length

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr('Bannerlar', 'Баннеры')}
        description={tr(
          `Bosh sahifa karuseli: ${activeCount} ta faol slayd, tartib bo'yicha`,
          `Карусель на главной: активных слайдов — ${activeCount}, по порядку`,
        )}
        actions={
          <>
            <SegmentedControl label={tr("Ko'rinish tili", 'Язык предпросмотра')} value={lang} onChange={setLang} options={LANG_OPTIONS} />
            <button type="button" onClick={() => setEditing('new')} className={`btn-primary ${buttonClass}`}>
              <Plus size={16} />
              {tr('Yangi banner', 'Новый баннер')}
            </button>
          </>
        }
      />
      {banners.length === 0 ? (
        <EmptyState icon={GalleryHorizontal} title={tr("Banner yo'q", 'Баннеров нет')} message={tr("Bosh sahifada karusel ko'rinmaydi", 'Карусель на главной не показывается')} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {banners.map((banner) => (
            <Card key={banner.id} className={banner.active ? '' : 'opacity-70'}>
              <div className="p-3">
                <BannerPreview banner={banner} lang={lang} />
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-500 tabular-nums">#{banner.sort}</span>
                    {banner.active ? <Badge tone="success">{tr('Faol', 'Активен')}</Badge> : <Badge>{tr('Yashirilgan', 'Скрыт')}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">{banner.link}</p>
                </div>
                <Switch checked={banner.active} onChange={() => void toggle(banner)} label={tr('Faol', 'Активен')} />
                <IconButton label={tr('Tahrirlash', 'Редактировать')} onClick={() => setEditing(banner)}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => void remove(banner)}>
                  <Trash size={15} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <BannerModal
          banner={editing === 'new' ? null : editing}
          nextSort={Math.max(0, ...db.banners.map((banner) => banner.sort)) + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
