import { Megaphone, Send, Square, TestTube2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Badge from '@/components/admin/Badge'
import { confirmDanger } from '@/components/admin/confirm'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass, selectClass, tdClass, textareaClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { isHttpsUrl } from '@/integrations/telegram/api'
import { subscriberLang, telegramAction, telegramApi, type Audience, type Subscriber, type TelegramData } from '@/integrations/telegram/store'
import { formatDateTime, formatNumber } from '@/lib/format'
import AppSwal from '@/lib/swal'
import { showToast } from '@/lib/toast'
import { bilingual, ruPlural, tr } from '@/staff/i18n'
import { useOrdersByTelegramId } from './subscriberOrders'

const AUDIENCE_LABEL = bilingual<Audience>({
  all: ['Barcha faol obunachilar', 'Все активные подписчики'],
  buyers: ['Buyurtma berganlar', 'Сделавшие заказ'],
  ru: ['Rus tilidagilar', 'Русскоязычные'],
  uz: ["O'zbek tilidagilar", 'Узбекоязычные'],
})

/**
 * Rassilka: barcha (yoki tanlangan) obunachilarga xabar, Mini App tugmasi bilan. Server yuboradi — sahifa yopilsa ham
 * davom etadi; jarayon va tarix socket orqali yangilanadi.
 */
export default function BroadcastTab({ data }: { data: TelegramData }) {
  const { status, subscribers, broadcasts } = data
  const ordersById = useOrdersByTelegramId()
  const [text, setText] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [withButton, setWithButton] = useState(true)
  const [buttonText, setButtonText] = useState("Do'konni ochish · Открыть магазин")
  const [starting, setStarting] = useState(false)
  // jarayondagi rassilka — serverdan (har ~2 soniyada yangilanadi)
  const progress = useMemo(() => broadcasts.find((item) => item.status === 'running') ?? null, [broadcasts])
  const running = !!progress || starting
  const buttonReady = isHttpsUrl(status.miniAppUrl)

  // ekrandagi son — server ham xuddi shu qoida bilan tanlaydi
  const recipients = useMemo(() => {
    const active = subscribers.filter((item) => item.status === 'active')
    const pick: Record<Audience, (item: Subscriber) => boolean> = {
      all: () => true,
      buyers: (item) => ordersById.has(item.id),
      ru: (item) => subscriberLang(item.languageCode) === 'ru',
      uz: (item) => subscriberLang(item.languageCode) === 'uz',
    }
    return active.filter(pick[audience])
  }, [subscribers, audience, ordersById])

  const history = useMemo(() => [...broadcasts].sort((a, b) => b.at.localeCompare(a.at)), [broadcasts])
  const { pageItems, pagination } = usePagination(history)

  const sendTest = async () => {
    if (!status.notify.staffChatId.trim()) {
      void AppSwal.fire({
        title: tr('Sinov chati tanlanmagan', 'Чат для теста не выбран'),
        text: tr(
          "«Bildirishnomalar» bo'limida xodimlar chatini kiriting yoki «Obunachilar» ro'yxatidan o'zingizni belgilang.",
          'Укажите чат сотрудников в разделе «Уведомления» или отметьте себя в списке «Подписчики».',
        ),
        icon: 'info',
      })
      return
    }
    const result = await telegramAction(() => telegramApi.testBroadcast({ text: text.trim(), withButton, buttonText }), tr('Yuborilmadi', 'Не отправлено'))
    if (result !== null) showToast(tr('Sinov xabari yuborildi', 'Тестовое сообщение отправлено'))
  }

  const start = async () => {
    const count = formatNumber(recipients.length)
    const audienceLabel = AUDIENCE_LABEL[audience].toLowerCase()
    const ok = await confirmDanger(
      tr('Rassilkani boshlash', 'Начать рассылку'),
      tr(
        `${count} ta obunachiga xabar yuboriladi (${audienceLabel}). Yuborilgan xabarni qaytarib bo'lmaydi.`,
        `Сообщение получат ${count} ${ruPlural(recipients.length, 'подписчик', 'подписчика', 'подписчиков')} (${audienceLabel}). Отправленное сообщение нельзя отозвать.`,
      ),
      tr('Yuborish', 'Отправить'),
    )
    if (!ok) return
    setStarting(true)
    const record = await telegramAction(() => telegramApi.startBroadcast({ text: text.trim(), audience, withButton, buttonText }))
    setStarting(false)
    if (record === null) return
    showToast(tr('Rassilka boshlandi — sahifa yopilsa ham davom etadi', 'Рассылка запущена — продолжится, даже если закрыть страницу'))
    setText('')
  }

  const stop = async () => {
    if (progress) await telegramAction(() => telegramApi.stopBroadcast(progress.id))
  }


  const percent = progress && progress.total > 0 ? Math.round(((progress.sent + progress.failed + progress.blocked) / progress.total) * 100) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={tr('Yangi rassilka', 'Новая рассылка')} hint={tr('Aksiya, yangi atirlar, bayram tabrigi...', 'Акция, новые ароматы, праздничное поздравление...')} />
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Field
              label={tr('Xabar matni', 'Текст сообщения')}
              htmlFor="bc-text"
              hint={tr(
                '<b>qalin</b>, <i>kursiv</i>, <a href="...">havola</a> ishlaydi',
                'Работает разметка <b>жирный</b>, <i>курсив</i>, <a href="...">ссылка</a>',
              )}
            >
              <textarea
                id="bc-text"
                rows={7}
                value={text}
                disabled={running}
                onChange={(event) => setText(event.target.value)}
                placeholder={tr(
                  "Masalan: 🎁 Bu hafta barcha yangi atirlar 50 g dan! Do'konni ochib tanlang.",
                  'Например: 🎁 На этой неделе все новинки от 50 г! Откройте магазин и выбирайте.',
                )}
                className={textareaClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Kimlarga', 'Кому')} htmlFor="bc-audience">
                <select id="bc-audience" value={audience} disabled={running} onChange={(event) => setAudience(event.target.value as Audience)} className={selectClass}>
                  {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((value) => (
                    <option key={value} value={value}>
                      {AUDIENCE_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr('Tugma matni', 'Текст кнопки')} htmlFor="bc-button">
                <div className="flex items-center gap-2">
                  <Switch checked={withButton} onChange={setWithButton} label={tr("Do'konni ochish tugmasi", 'Кнопка «Открыть магазин»')} />
                  <input
                    id="bc-button"
                    value={buttonText}
                    disabled={!withButton || running}
                    onChange={(event) => setButtonText(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </Field>
            </div>
            {withButton && !buttonReady && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {tr(
                  "Tugma qo'shilmaydi: «Bot sozlamalari» da Mini App manzili (https://...) kiritilmagan.",
                  'Кнопка не будет добавлена: в «Настройках бота» не указан адрес Mini App (https://...).',
                )}
              </p>
            )}
          </div>

          {/* Telegram'dagi ko'rinishga yaqin oldindan ko'rish */}
          <div>
            <p className="mb-1 text-xs font-semibold text-neutral-600">{tr("Oldindan ko'rish", 'Предпросмотр')}</p>
            <div className="rounded bg-[#d5e3ee] p-3 dark:bg-neutral-100">
              <div className="rounded bg-white px-3 py-2 text-sm whitespace-pre-wrap text-neutral-900 shadow-sm">
                {text.trim() ? text.replace(/<[^>]+>/g, '') : <span className="text-neutral-400">{tr("Matn shu yerda ko'rinadi", 'Здесь появится текст')}</span>}
              </div>
              {withButton && buttonReady && buttonText.trim() && (
                <div className="mt-1 rounded bg-white/70 px-3 py-1.5 text-center text-sm font-medium text-sky-700">{buttonText}</div>
              )}
            </div>
          </div>
        </div>

        {progress && (
          <div className="border-t border-neutral-200 px-4 py-3">
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-neutral-600 tabular-nums">
              <span>
                {tr('Yuborildi', 'Отправлено')}: <b className="text-emerald-700">{formatNumber(progress.sent)}</b> · {tr('Bloklagan', 'Заблокировали')}:{' '}
                {formatNumber(progress.blocked)} · {tr('Xato', 'Ошибки')}: {formatNumber(progress.failed)} / {formatNumber(progress.total)}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full bg-brand-fill transition-[width]" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            {tr('Qabul qiluvchilar', 'Получатели')}: <b className="text-neutral-900 tabular-nums">{formatNumber(recipients.length)}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void sendTest()} disabled={!text.trim() || running} className={`btn-ghost ${buttonClass} h-9`}>
              <TestTube2 size={15} />
              {tr("Sinov (o'zimga)", 'Тест (себе)')}
            </button>
            {running ? (
              <button type="button" onClick={() => void stop()} className={`btn-outline ${buttonClass} h-9`}>
                <Square size={14} />
                {tr("To'xtatish", 'Остановить')}
              </button>
            ) : (
              <button type="button" onClick={() => void start()} disabled={!text.trim() || recipients.length === 0} className={`btn-primary ${buttonClass} h-9`}>
                <Send size={15} />
                {tr('Yuborish', 'Отправить')}
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={tr('Rassilkalar tarixi', 'История рассылок')} />
        {history.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Megaphone} title={tr('Hali rassilka yuborilmagan', 'Рассылок пока не было')} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className={thClass}>{tr('Sana', 'Дата')}</th>
                  <th className={thClass}>{tr('Matn', 'Текст')}</th>
                  <th className={thClass}>{tr('Kimlarga', 'Кому')}</th>
                  <th className={thClass}>{tr('Yuborildi', 'Отправлено')}</th>
                  <th className={thClass}>{tr('Bloklagan', 'Заблокировали')}</th>
                  <th className={thClass}>{tr('Xato', 'Ошибки')}</th>
                  <th className={thClass}>{tr('Holat', 'Статус')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageItems.map((item) => (
                  <tr key={item.id}>
                    <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDateTime(item.at)}</td>
                    <td className={`${tdClass} max-w-xs truncate`} title={item.text}>
                      {item.text.replace(/<[^>]+>/g, '')}
                    </td>
                    <td className={`${tdClass} text-neutral-600`}>{AUDIENCE_LABEL[item.audience] ?? item.audience}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {formatNumber(item.sent)} / {formatNumber(item.total)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{formatNumber(item.blocked)}</td>
                    <td className={`${tdClass} tabular-nums`}>{formatNumber(item.failed)}</td>
                    <td className={tdClass}>
                      {item.status === 'done' ? (
                        <Badge tone="success">{tr('Tugadi', 'Завершена')}</Badge>
                      ) : item.status === 'stopped' ? (
                        <Badge tone="warning">{tr("To'xtatildi", 'Остановлена')}</Badge>
                      ) : (
                        <Badge tone="info">{tr('Yuborilmoqda', 'Отправляется')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} />
      </Card>
    </div>
  )
}
