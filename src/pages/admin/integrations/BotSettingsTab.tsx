import { Download, Plus, Save, Smartphone, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { showErrors } from '@/components/admin/confirm'
import { Card, CardHeader } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import IconButton from '@/components/ui/IconButton'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass, textareaClass } from '@/components/ui/styles'
import { isHttpsUrl, type TgBotCommand, type TgMenuButton } from '@/integrations/telegram/api'
import { telegramAction, telegramApi, type BotProfile, type TelegramStatus } from '@/integrations/telegram/store'
import { showToast } from '@/lib/toast'
import { tr } from '@/staff/i18n'

/**
 * Bot profili (buyruqlar, tavsif, menyu tugmasi) — Telegram'dan server orqali (`GET /api/telegram/profile`).
 * `null` — yuklanmoqda; `false` — olinmadi (bo'sh formalar bilan ishlash mumkin).
 */
function useBotProfile() {
  const [profile, setProfile] = useState<BotProfile | null | false>(null)
  useEffect(() => {
    let alive = true
    void telegramAction(() => telegramApi.profile()).then((result) => {
      if (alive) setProfile(result ?? false)
    })
    return () => {
      alive = false
    }
  }, [])
  const reload = useCallback(async () => {
    const result = await telegramAction(() => telegramApi.profile())
    setProfile(result ?? false)
    return result
  }, [])
  return { profile, reload }
}

/** Mini App va menyu tugmasi, /start salomlashuvi, buyruqlar menyusi, bot tavsifi. */
export default function BotSettingsTab({ status }: { status: TelegramStatus }) {
  const { profile, reload } = useBotProfile()
  return (
    <div className="space-y-4">
      <MiniAppCard status={status} current={profile ? profile.menuButton : null} onSaved={() => void reload()} />
      <WelcomeCard key={JSON.stringify(status.welcome)} welcome={status.welcome} />
      <div className="grid gap-4 xl:grid-cols-2">
        <CommandsCard key={`commands-${profile ? JSON.stringify(profile.commands) : String(profile)}`} profile={profile} reload={reload} />
        <ProfileCard key={`profile-${profile ? profile.description + profile.shortDescription : String(profile)}`} profile={profile} />
      </div>
    </div>
  )
}

function MiniAppCard({ status, current, onSaved }: { status: TelegramStatus; current: TgMenuButton | null; onSaved: () => void }) {
  const [url, setUrl] = useState(status.miniAppUrl)
  const [text, setText] = useState(status.menuButtonText)
  const [busy, setBusy] = useState(false)

  const install = async () => {
    const errors: string[] = []
    if (!isHttpsUrl(url.trim()))
      errors.push(
        tr(
          'Manzil https:// bilan boshlanishi kerak — Telegram faqat himoyalangan saytni ochadi',
          'Адрес должен начинаться с https:// — Telegram открывает только защищённые сайты',
        ),
      )
    if (!text.trim()) errors.push(tr('Tugma matnini kiriting', 'Введите текст кнопки'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    setBusy(true)
    // Telegram'dagi tugma va serverdagi manzil (salomlashuv va rassilka tugmalari shu manzilni ochadi)
    const result = await telegramAction(async () => {
      await telegramApi.setMenuButton({ type: 'web_app', text: text.trim(), url: url.trim() })
      await telegramApi.updateSettings({ miniAppUrl: url.trim(), menuButtonText: text.trim() })
    })
    setBusy(false)
    if (result === null) return
    onSaved()
    showToast(tr("Menyu tugmasi o'rnatildi", 'Кнопка меню установлена'))
  }

  const resetButton = async () => {
    setBusy(true)
    const result = await telegramAction(() => telegramApi.setMenuButton({ type: 'commands' }))
    setBusy(false)
    if (result === null) return
    onSaved()
    showToast(tr('Standart menyu qaytarildi', 'Стандартное меню восстановлено'))
  }

  return (
    <Card>
      <CardHeader
        title={tr("Mini App (do'kon)", 'Mini App (магазин)')}
        hint={tr('Bot chatidagi menyu tugmasi mijoz ilovasini ochadi', 'Кнопка меню в чате бота открывает приложение клиента')}
      />
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Field
          label={tr('Mijoz ilovasi manzili', 'Адрес приложения клиента')}
          htmlFor="tg-app-url"
          hint={tr("Sayt hostingga qo'yilgach (Vercel, Netlify...) uning https manzili", 'Https-адрес сайта после размещения на хостинге (Vercel, Netlify...)')}
        >
          <input id="tg-app-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://parfum1688.uz" className={inputClass} />
        </Field>
        <Field label={tr('Tugma matni', 'Текст кнопки')} htmlFor="tg-menu-text">
          <input id="tg-menu-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={64} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <Smartphone size={14} className="shrink-0" />
          {tr('Hozir', 'Сейчас')}:{' '}
          {current === null
            ? tr('yuklanmoqda…', 'загрузка…')
            : current.type === 'web_app'
              ? `«${current.text}» → ${current.web_app.url}`
              : tr("buyruqlar menyusi (Mini App tugmasi yo'q)", 'меню команд (кнопки Mini App нет)')}
        </p>
        <div className="flex flex-wrap gap-2">
          {current?.type === 'web_app' && (
            <button type="button" onClick={() => void resetButton()} disabled={busy} className={`btn-ghost ${buttonClass} h-9`}>
              {tr('Olib tashlash', 'Убрать')}
            </button>
          )}
          <button type="button" onClick={() => void install()} disabled={busy} className={`btn-primary ${buttonClass} h-9`}>
            <Upload size={15} />
            {tr("Menyu tugmasiga o'rnatish", 'Установить в кнопку меню')}
          </button>
        </div>
      </div>
    </Card>
  )
}

function WelcomeCard({ welcome }: { welcome: TelegramStatus['welcome'] }) {
  const [draft, setDraft] = useState(welcome)
  const dirty = JSON.stringify(draft) !== JSON.stringify(welcome)
  const set = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch })

  return (
    <Card>
      <CardHeader
        title={tr('/start salomlashuvi', 'Приветствие на /start')}
        hint={tr(
          "Foydalanuvchi botni ishga tushirganda — uning tilida, do'konni ochish tugmasi bilan",
          'Когда пользователь запускает бота — на его языке, с кнопкой открытия магазина',
        )}
        actions={<Switch checked={draft.enabled} onChange={(enabled) => set({ enabled })} label={tr('Salomlashuv yoqilgan', 'Приветствие включено')} />}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label={tr('Ruscha matn', 'Текст на русском')} htmlFor="tg-welcome-ru">
            <textarea id="tg-welcome-ru" rows={4} value={draft.ru} onChange={(event) => set({ ru: event.target.value })} className={textareaClass} />
          </Field>
          <Field label={tr('Ruscha tugma', 'Кнопка на русском')} htmlFor="tg-welcome-btn-ru">
            <input id="tg-welcome-btn-ru" value={draft.buttonRu} onChange={(event) => set({ buttonRu: event.target.value })} className={inputClass} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label={tr("O'zbekcha matn", 'Текст на узбекском')} htmlFor="tg-welcome-uz">
            <textarea id="tg-welcome-uz" rows={4} value={draft.uz} onChange={(event) => set({ uz: event.target.value })} className={textareaClass} />
          </Field>
          <Field label={tr("O'zbekcha tugma", 'Кнопка на узбекском')} htmlFor="tg-welcome-btn-uz">
            <input id="tg-welcome-btn-uz" value={draft.buttonUz} onChange={(event) => set({ buttonUz: event.target.value })} className={inputClass} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end border-t border-neutral-200 px-4 py-3">
        <button
          type="button"
          disabled={!dirty}
          onClick={async () => {
            if ((await telegramAction(() => telegramApi.updateSettings({ welcome: draft }))) !== null) showToast(tr('Saqlandi', 'Сохранено'))
          }}
          className={`btn-primary ${buttonClass} h-9`}
        >
          <Save size={15} />
          {tr('Saqlash', 'Сохранить')}
        </button>
      </div>
    </Card>
  )
}

const COMMAND_PATTERN = /^[a-z0-9_]{1,32}$/

const DEFAULT_COMMANDS: TgBotCommand[] = [{ command: 'start', description: "Do'konni ochish" }]

function CommandsCard({ profile, reload }: { profile: BotProfile | null | false; reload: () => Promise<BotProfile | null> }) {
  const [commands, setCommands] = useState<TgBotCommand[]>(() => (profile && profile.commands.length ? profile.commands : DEFAULT_COMMANDS))
  const loaded = profile !== null
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    await reload()
    setBusy(false)
  }

  const save = async () => {
    const cleaned = commands.map((item) => ({ command: item.command.trim().replace(/^\//, '').toLowerCase(), description: item.description.trim() }))
    const errors: string[] = []
    if (cleaned.some((item) => !COMMAND_PATTERN.test(item.command)))
      errors.push(tr('Buyruq: faqat lotin kichik harf, raqam va _ (32 belgigacha)', 'Команда: только строчные латинские буквы, цифры и _ (до 32 символов)'))
    if (cleaned.some((item) => item.description.length < 1 || item.description.length > 256))
      errors.push(tr('Har bir buyruqqa izoh yozing (256 belgigacha)', 'Добавьте описание к каждой команде (до 256 символов)'))
    if (new Set(cleaned.map((item) => item.command)).size !== cleaned.length) errors.push(tr('Buyruqlar takrorlanmasin', 'Команды не должны повторяться'))
    if (errors.length) return showErrors(tr("Formani to'ldiring", 'Заполните форму'), errors)
    setBusy(true)
    const result = await telegramAction(() => telegramApi.setCommands(cleaned))
    setBusy(false)
    if (result === null) return
    setCommands(cleaned)
    showToast(tr('Buyruqlar menyusi yangilandi', 'Меню команд обновлено'))
  }

  const update = (index: number, patch: Partial<TgBotCommand>) => setCommands(commands.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  return (
    <Card>
      <CardHeader
        title={tr('Buyruqlar menyusi', 'Меню команд')}
        hint={tr("Chatdagi «/» tugmasida ko'rinadi", 'Отображается по кнопке «/» в чате')}
        actions={
          <IconButton label={tr("Telegram'dan qayta yuklash", 'Загрузить заново из Telegram')} onClick={() => void load()}>
            <Download size={15} />
          </IconButton>
        }
      />
      <div className="space-y-2 p-4">
        {!loaded && <p className="text-sm text-neutral-500">{tr('Yuklanmoqda…', 'Загрузка…')}</p>}
        {commands.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="relative w-36 shrink-0">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">/</span>
              <input
                value={item.command}
                onChange={(event) => update(index, { command: event.target.value })}
                aria-label={tr('Buyruq', 'Команда')}
                className={`${inputClass} pl-6 font-mono`}
              />
            </div>
            <input
              value={item.description}
              onChange={(event) => update(index, { description: event.target.value })}
              aria-label={tr('Izoh', 'Описание')}
              className={inputClass}
            />
            <IconButton label={tr("O'chirish", 'Удалить')} tone="danger" onClick={() => setCommands(commands.filter((_, i) => i !== index))}>
              <Trash2 size={15} />
            </IconButton>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCommands([...commands, { command: '', description: '' }])}
          disabled={commands.length >= 20}
          className={`btn-outline ${buttonClass} h-9 px-3`}
        >
          <Plus size={15} />
          {tr("Buyruq qo'shish", 'Добавить команду')}
        </button>
      </div>
      <div className="flex justify-end border-t border-neutral-200 px-4 py-3">
        <button type="button" onClick={() => void save()} disabled={busy || !loaded} className={`btn-primary ${buttonClass} h-9`}>
          <Save size={15} />
          {tr("Telegram'ga saqlash", 'Сохранить в Telegram')}
        </button>
      </div>
    </Card>
  )
}

function ProfileCard({ profile }: { profile: BotProfile | null | false }) {
  const [description, setDescription] = useState(profile ? profile.description : '')
  const [shortDescription, setShortDescription] = useState(profile ? profile.shortDescription : '')
  const loaded = profile !== null
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const result = await telegramAction(() => telegramApi.setDescription(description.trim(), shortDescription.trim()))
    setBusy(false)
    if (result !== null) showToast(tr('Bot tavsifi yangilandi', 'Описание бота обновлено'))
  }

  return (
    <Card>
      <CardHeader
        title={tr('Bot tavsifi', 'Описание бота')}
        hint={tr("Yangi foydalanuvchi /start bosishidan oldin ko'radi", 'Новый пользователь видит его до нажатия /start')}
      />
      <div className="space-y-3 p-4">
        <Field label={tr("Tavsif (bo'sh chatda)", 'Описание (в пустом чате)')} htmlFor="tg-desc" hint={`${description.length} / 512`}>
          <textarea id="tg-desc" rows={4} maxLength={512} value={description} disabled={!loaded} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
        </Field>
        <Field label={tr('Qisqa tavsif (bot profilida)', 'Краткое описание (в профиле бота)')} htmlFor="tg-short" hint={`${shortDescription.length} / 120`}>
          <input id="tg-short" maxLength={120} value={shortDescription} disabled={!loaded} onChange={(event) => setShortDescription(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end border-t border-neutral-200 px-4 py-3">
        <button type="button" onClick={() => void save()} disabled={busy || !loaded} className={`btn-primary ${buttonClass} h-9`}>
          <Save size={15} />
          {tr("Telegram'ga saqlash", 'Сохранить в Telegram')}
        </button>
      </div>
    </Card>
  )
}
