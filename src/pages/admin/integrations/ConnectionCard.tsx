import { Bot, Eye, EyeOff, Link2, Link2Off, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import Badge from '@/components/admin/Badge'
import { confirmDanger } from '@/components/admin/confirm'
import { Card, CardHeader } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass } from '@/components/ui/styles'
import { isTokenLike } from '@/integrations/telegram/api'
import { telegramAction, telegramApi, type TelegramStatus } from '@/integrations/telegram/store'
import { formatDateTime } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { staffLang, tr } from '@/staff/i18n'

/** Token bilan ulash, bot ma'lumoti, yangilanishlarni qabul qilish holati (serverda), webhook ogohlantirishi. */
export default function ConnectionCard({ status }: { status: TelegramStatus }) {
  const [token, setToken] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const failedTitle = tr("Bot bilan bog'lanib bo'lmadi", 'Не удалось связаться с ботом')

  const connect = async (value: string) => {
    const trimmed = value.trim()
    if (!isTokenLike(trimmed)) {
      void AppSwal.fire({
        title: tr("Token noto'g'ri", 'Неверный токен'),
        text: tr(
          "Token shunday ko'rinishda bo'ladi: 123456789:AAH...  (@BotFather → /newbot yoki /token)",
          'Токен выглядит так: 123456789:AAH...  (@BotFather → /newbot или /token)',
        ),
        icon: 'warning',
      })
      return
    }
    setBusy(true)
    // server tokenni Telegram'da tekshiradi (getMe); boshqa bot bo'lsa — oldingi obunachilar va tarix tozalanadi
    const result = await telegramAction(() => telegramApi.connect(trimmed), failedTitle)
    setBusy(false)
    if (result === null) return
    setToken('')
    showToast(tr('Bot ulandi', 'Бот подключён'))
  }

  const refresh = async () => {
    setBusy(true)
    const result = await telegramAction(() => telegramApi.refresh(), failedTitle)
    setBusy(false)
    if (result !== null) showToast(tr('Bot holati yangilandi', 'Статус бота обновлён'))
  }

  const disconnect = async () => {
    const ok = await confirmDanger(
      tr('Botni uzish', 'Отключить бота'),
      tr(
        "Token serverdan o'chiriladi: yangilanishlar va xabarnomalar to'xtaydi. Obunachilar ro'yxati saqlanib qoladi.",
        'Токен будет удалён с сервера: получение обновлений и уведомления остановятся. Список подписчиков сохранится.',
      ),
      tr('Uzish', 'Отключить'),
    )
    if (!ok) return
    if ((await telegramAction(() => telegramApi.disconnect())) !== null) showToast(tr('Bot uzildi', 'Бот отключён'))
  }

  const removeWebhook = async () => {
    const ok = await confirmDanger(
      tr("Webhook'ni o'chirish", 'Удалить webhook'),
      tr(
        "Webhook o'chirilsa, yangilanishlarni shu server qabul qiladi. Agar webhook boshqa server uchun o'rnatilgan bo'lsa, u server xabar ololmay qoladi.",
        'После удаления webhook обновления будет получать этот сервер. Если webhook установлен для другого сервера, тот перестанет получать сообщения.',
      ),
      tr("O'chirish", 'Удалить'),
    )
    if (!ok) return
    if ((await telegramAction(() => telegramApi.deleteWebhook())) !== null) showToast(tr("Webhook o'chirildi", 'Webhook удалён'))
  }

  if (!status.connected || !status.bot) {
    return (
      <Card>
        <CardHeader
          title={tr('Telegram bot', 'Telegram-бот')}
          hint={tr('Mijozlar ilovasi shu bot orqali ochiladi', 'Через этого бота клиенты открывают приложение')}
        />
        <div className="space-y-4 p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600">
            {staffLang() === 'uz' ? (
              <li>
                Telegram'da <b>@BotFather</b> ni oching va <code className="rounded bg-neutral-100 px-1">/newbot</code> buyrug'i bilan bot yarating (yoki
                mavjud botning <code className="rounded bg-neutral-100 px-1">/token</code> ini oling).
              </li>
            ) : (
              <li>
                Откройте в Telegram <b>@BotFather</b> и создайте бота командой <code className="rounded bg-neutral-100 px-1">/newbot</code> (или получите
                токен существующего бота командой <code className="rounded bg-neutral-100 px-1">/token</code>).
              </li>
            )}
            <li>{tr("Bergan tokenni quyidagi maydonga qo'ying va «Ulash» ni bosing.", 'Вставьте полученный токен в поле ниже и нажмите «Подключить».')}</li>
          </ol>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              void connect(token)
            }}
          >
            <Field label={tr('Bot tokeni', 'Токен бота')} htmlFor="tg-token" className="min-w-0 flex-1">
              <div className="relative">
                <input
                  id="tg-token"
                  type={visible ? 'text' : 'password'}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="123456789:AAH..."
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} pr-10 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? tr('Yashirish', 'Скрыть') : tr("Ko'rsatish", 'Показать')}
                  title={visible ? tr('Yashirish', 'Скрыть') : tr("Ko'rsatish", 'Показать')}
                  className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <button type="submit" disabled={busy || !token.trim()} className={`btn-primary ${buttonClass} shrink-0`}>
              <Link2 size={16} />
              {busy ? tr('Tekshirilmoqda…', 'Проверка…') : tr('Ulash', 'Подключить')}
            </button>
          </form>
          <SecurityNote />
        </div>
      </Card>
    )
  }

  const bot = status.bot
  const pollingLabel = !status.polling
    ? tr("O'chiq", 'Выключено')
    : status.webhookUrl
      ? tr("Webhook tufayli to'xtagan", 'Остановлено из-за webhook')
      : status.running
        ? tr('Faol — serverda', 'Активно — на сервере')
        : tr('Ishga tushmoqda…', 'Запускается…')

  return (
    <Card>
      <CardHeader
        title={tr('Telegram bot', 'Telegram-бот')}
        hint={status.connectedAt ? `${tr('Ulangan', 'Подключён')}: ${formatDateTime(status.connectedAt)}` : undefined}
        actions={<Badge tone="success">{tr('Ulangan', 'Подключён')}</Badge>}
      />
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-fill text-white">
            <Bot size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-900">{bot.first_name}</p>
            <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
              @{bot.username}
            </a>
            <p className="text-xs text-neutral-500 tabular-nums">
              ID: {bot.id}
              {status.tokenHint && <span className="ml-2 font-mono">· {status.tokenHint}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void refresh()} disabled={busy} className={`btn-ghost ${buttonClass} h-9`}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
            {tr('Tekshirish', 'Проверить')}
          </button>
          <button type="button" onClick={() => void disconnect()} className={`btn-ghost ${buttonClass} h-9 text-red-700!`}>
            <Link2Off size={15} />
            {tr('Uzish', 'Отключить')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900">{tr('Yangilanishlarni qabul qilish', 'Получение обновлений')}</p>
          <p className="text-xs text-neutral-500">
            {tr(
              "/start, xabarlar va bloklashlarni server qabul qiladi — admin yoki kassa sahifasi yopiq bo'lsa ham. Holat:",
              '/start, сообщения и блокировки принимает сервер — даже если админка и касса закрыты. Статус:',
            )}{' '}
            <span className={`font-semibold ${status.polling && status.running ? 'text-emerald-700' : 'text-neutral-700'}`}>{pollingLabel}</span>
            {status.lastPollAt && (
              <>
                {' '}
                · {tr('oxirgi tekshiruv', 'последняя проверка')} {formatDateTime(status.lastPollAt)}
              </>
            )}
          </p>
        </div>
        <Switch
          checked={status.polling}
          onChange={(polling) => void telegramAction(() => telegramApi.updateSettings({ polling }))}
          label={tr('Yangilanishlarni qabul qilish', 'Получение обновлений')}
        />
      </div>

      {status.webhookUrl && (
        <div className="flex flex-col gap-3 border-t border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <TriangleAlert size={18} className="shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-sm text-amber-700">
            {tr("Botda webhook o'rnatilgan:", 'У бота установлен webhook:')} <span className="font-mono break-all">{status.webhookUrl}</span>.{' '}
            {tr('Bu holatda yangilanishlarni server ola olmaydi.', 'В этом случае сервер не может получать обновления.')}
          </p>
          <button type="button" onClick={() => void removeWebhook()} className={`btn-ghost ${buttonClass} h-9 shrink-0`}>
            {tr("Webhook'ni o'chirish", 'Удалить webhook')}
          </button>
        </div>
      )}
      {status.lastError && (
        <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{status.lastError}</span>
          <button
            type="button"
            onClick={() => void telegramAction(() => telegramApi.updateSettings({ clearError: true }))}
            className="shrink-0 cursor-pointer text-xs font-semibold underline"
          >
            {tr('Yopish', 'Закрыть')}
          </button>
        </div>
      )}
      <div className="border-t border-neutral-200 px-4 py-3">
        <SecurityNote />
      </div>
    </Card>
  )
}

function SecurityNote() {
  return (
    <p className="flex items-start gap-2 text-xs text-neutral-500">
      <ShieldAlert size={14} className="mt-px shrink-0 text-neutral-400" />
      {tr(
        "Token serverda saqlanadi va brauzerga qaytarilmaydi. Uni hech kimga bermang — u bilan botni to'liq boshqarish mumkin.",
        'Токен хранится на сервере и не возвращается в браузер. Никому не передавайте его: с ним можно полностью управлять ботом.',
      )}
    </p>
  )
}
