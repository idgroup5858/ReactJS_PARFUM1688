import { Check, FolderOpen, ImagePlus, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { http } from '@/api/http'
import Img from '@/components/ui/Img'
import Modal from '@/components/ui/Modal'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { buttonClass } from '@/components/ui/styles'
import { showApiError } from '@/data/db'
import { IMAGE_FOLDERS, imageUrl, type ImageFile, type ImageFolder } from '@/images'
import { showToast } from '@/lib/toast'
import { bilingual, tr } from '@/staff/i18n'

/** Shaffof PNG flakonlar kulrang "sahna"da, qolganlari (kategoriya, banner, nota) joyni to'ldirib ko'rsatiladi. */
const STAGED: ImageFolder[] = ['perfumes', 'flakons', 'banners']

/** Papka nomlari xodim tilida (images/index.ts dagi `name` — o'zbekcha). */
const FOLDER_LABEL = bilingual<ImageFolder>({
  perfumes: ['Atirlar', 'Ароматы'],
  notes: ['Notalar', 'Ноты'],
  categories: ['Kategoriyalar', 'Категории'],
  banners: ['Bannerlar', 'Баннеры'],
  flakons: ['Flakonlar', 'Флаконы'],
})

/** Fayl nomi kengaytmasiz: saqlangan "perfumes/dior-sauvage.png" galereyadagi dior-sauvage.jpg ga mos keladi. */
const stem = (path: string) => path.replace(/\.[^./]+$/, '').toLowerCase()

/** Serverdagi rasm (`GET /api/images`): papkaga qo'lda tashlangan va admin yuklaganlari. */
type ServerImage = { path: string; url: string; name: string }

/** `url` — `VITE_API_URL` bilan ham ishlaydigan to'liq manzil (serverning `url` i nisbiy: "/images/..."). */
const toImageFile = (image: ServerImage): ImageFile => ({ path: image.path, name: image.name, url: imageUrl(image.path) ?? image.url })

/**
 * Papkadagi rasmlar serverdan; server javob bermasa — xato va bo'sh ro'yxat. Yuklangan rasm ro'yxatga darhol qo'shiladi.
 */
function useFolderImages(folder: ImageFolder) {
  // qaysi papkaniki — papka almashganda eski ro'yxat ko'rinmasin (yangisi kelguncha "yuklanmoqda")
  const [loaded, setLoaded] = useState<{ folder: ImageFolder; list: ImageFile[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    http
      .get<ServerImage[]>('/images', { folder })
      .then((list) => list.map(toImageFile))
      .catch((error: unknown) => {
        if (!cancelled) showApiError(error, tr("Rasmlar ro'yxati olinmadi", 'Не удалось получить список изображений'))
        return []
      })
      .then((list) => {
        if (!cancelled) setLoaded({ folder, list })
      })
    return () => {
      cancelled = true
    }
  }, [folder])
  const images = loaded?.folder === folder ? loaded.list : null
  const add = (image: ImageFile) =>
    setLoaded((current) => ({
      folder,
      list: [...(current?.folder === folder ? current.list : []).filter((item) => item.path !== image.path), image].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
    }))
  return { images, add }
}

type ModalProps = {
  folder: ImageFolder
  value: string
  onSelect: (path: string) => void
  onClose: () => void
}

/**
 * Rasm tanlash oynasi: serverdagi rasmlar galereyasi (papkalar, nomi bo'yicha qidirish) va kompyuterdan yuklash;
 * tanlangan rasm yo'li ("perfumes/dior-sauvage.png") qaytariladi.
 *
 * Oyna `document.body` ga chiziladi: maydon `sticky` ustunda turgan bo'lsa (atir formasi), ustun o'z stacking
 * context'ini yaratadi va z-50 oyna sidebar hamda header ostida qolib ketardi.
 */
export function ImagePickerModal({ folder: initialFolder, value, onSelect, onClose }: ModalProps) {
  const [folder, setFolder] = useState<ImageFolder>(initialFolder)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(value)
  const [uploading, setUploading] = useState(false)
  const activeRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { images: all, add } = useFolderImages(folder)
  const images = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (all ?? []).filter((image) => !needle || image.name.toLowerCase().includes(needle))
  }, [all, query])
  const staged = STAGED.includes(folder)
  // saqlangan yo'l kengaytmasi boshqa bo'lsa ham galereyadagi o'sha fayl belgilanadi
  const selectedPath = images.find((image) => image.path === selected)?.path ?? images.find((image) => stem(image.path) === stem(selected))?.path

  // ro'yxat kelganda joriy rasm ko'rinib tursin (galereya uzun bo'lsa ham)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [all])

  const choose = (path: string) => {
    // o'sha fayl qayta tanlansa saqlangan yo'l o'zgarmaydi — forma behuda "o'zgardi" bo'lib qolmasin
    onSelect(stem(path) === stem(value) ? value : path)
    onClose()
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    const form = new FormData()
    form.set('folder', folder)
    form.set('file', file)
    setUploading(true)
    try {
      const image = await http.upload<ServerImage>('/images', form)
      add(toImageFile(image))
      setSelected(image.path)
      showToast(tr('Rasm yuklandi', 'Изображение загружено'))
    } catch (error) {
      showApiError(error, tr('Rasm yuklanmadi', 'Изображение не загружено'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return createPortal(
    <Modal
      title={tr('Rasm tanlash', 'Выбор изображения')}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto hidden min-w-0 self-center truncate text-xs text-neutral-500 sm:block">{selected || tr('Rasm tanlanmagan', 'Изображение не выбрано')}</p>
          <button type="button" onClick={onClose} className={`btn-ghost ${buttonClass}`}>
            {tr('Bekor qilish', 'Отмена')}
          </button>
          <button type="button" disabled={!selected} onClick={() => choose(selected)} className={`btn-primary ${buttonClass}`}>
            <Check size={16} />
            {tr('Tanlash', 'Выбрать')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            label={tr('Papka', 'Папка')}
            value={folder}
            onChange={setFolder}
            options={IMAGE_FOLDERS.map((item) => ({ value: item.id, label: FOLDER_LABEL[item.id] }))}
          />
          <div className="md:w-64">
            <SearchInput value={query} onChange={setQuery} placeholder={tr("Fayl nomi bo'yicha qidirish", 'Поиск по имени файла')} />
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 items-start gap-2">
            <FolderOpen size={14} className="mt-px shrink-0 text-brand-700" />
            <span>{tr('Yangi rasm: JPG, PNG, WEBP yoki AVIF, 5 MB gacha.', 'Новое изображение: JPG, PNG, WEBP или AVIF, до 5 МБ.')}</span>
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={`btn-outline ${buttonClass} h-8 shrink-0`}>
            <Upload size={14} />
            {uploading ? tr('Yuklanmoqda…', 'Загрузка…') : tr('Kompyuterdan yuklash', 'Загрузить с компьютера')}
          </button>
        </div>
        {all === null ? (
          <p className="py-12 text-center text-sm text-neutral-500">{tr('Yuklanmoqda…', 'Загрузка…')}</p>
        ) : images.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {query ? tr("Bu papkada mos rasm yo'q", 'В этой папке нет подходящих изображений') : tr("Bu papkada rasm yo'q", 'В этой папке нет изображений')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {images.map((image) => {
              const active = image.path === selectedPath
              return (
                <button
                  key={image.path}
                  ref={active ? activeRef : undefined}
                  type="button"
                  title={image.path}
                  aria-pressed={active}
                  onClick={() => setSelected(image.path)}
                  onDoubleClick={() => choose(image.path)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded border text-left transition-colors ${active ? 'border-brand-700 ring-1 ring-brand-700' : 'border-neutral-200 hover:border-neutral-400'}`}
                >
                  {/* overflow-hidden — tik (portret) rasm katakni kvadratdan cho'zib yubormasin */}
                  <span className={`block aspect-square w-full overflow-hidden ${staged ? 'bg-photo' : 'bg-neutral-100'}`}>
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      className={`h-full w-full ${staged ? 'object-contain p-1.5' : 'object-cover'}`}
                    />
                  </span>
                  <span className={`truncate px-1.5 py-1 text-[11px] ${active ? 'font-semibold text-brand-700' : 'text-neutral-600'}`}>{image.name}</span>
                  {active && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>,
    document.body,
  )
}

type FieldProps = {
  folder: ImageFolder
  value: string
  onChange: (path: string) => void
  /** katta preview (atir formasi) yoki ixcham qator (ma'lumotnoma oynalari) */
  variant?: 'large' | 'compact'
}

/** Formadagi rasm maydoni: joriy rasm + "Tanlash" / "Olib tashlash". */
export function ImageField({ folder, value, onChange, variant = 'compact' }: FieldProps) {
  const [open, setOpen] = useState(false)
  const staged = STAGED.includes(folder)
  const preview = (
    <Img
      path={value}
      alt={value || tr("Rasm yo'q", 'Нет изображения')}
      fit={staged ? 'contain' : 'cover'}
      className={`h-full w-full ${staged && value ? 'p-2' : ''}`}
    />
  )

  const actions = (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen(true)} className={`btn-outline ${buttonClass} h-9`}>
        <ImagePlus size={16} />
        {value ? tr('Almashtirish', 'Заменить') : tr('Tanlash', 'Выбрать')}
      </button>
      {value && (
        <button type="button" onClick={() => onChange('')} className={`btn-ghost ${buttonClass} h-9`}>
          <X size={16} />
          {tr('Olib tashlash', 'Убрать')}
        </button>
      )}
    </div>
  )

  return (
    <>
      {variant === 'large' ? (
        <div className="space-y-3">
          <div className={`aspect-square w-full overflow-hidden rounded border border-neutral-200 ${staged ? 'bg-photo' : 'bg-neutral-100'}`}>{preview}</div>
          <p className="truncate text-xs text-neutral-500" title={value}>
            {value || tr('Rasm tanlanmagan', 'Изображение не выбрано')}
          </p>
          {actions}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className={`h-16 w-16 shrink-0 overflow-hidden rounded border border-neutral-200 ${staged ? 'bg-photo' : 'bg-neutral-100'}`}>{preview}</div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-xs text-neutral-500" title={value}>
              {value || tr('Rasm tanlanmagan', 'Изображение не выбрано')}
            </p>
            {actions}
          </div>
        </div>
      )}
      {open && <ImagePickerModal folder={folder} value={value} onSelect={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}
