import { BellRing, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Switch from '@/components/ui/Switch'
import { buttonClass, inputClass } from '@/components/ui/styles'
import { useDb } from '@/data/db'
import { ORDER_STATUS_LABEL } from '@/domain/labels'
import type { Order } from '@/domain/types'
import { CUSTOMER_NOTIFY_STATUSES, customerStatusMessage, staffNewOrderMessage } from '@/integrations/telegram/messages'
import { telegramAction, telegramApi, type TelegramStatus } from '@/integrations/telegram/store'
import { showToast } from '@/lib/toast'
import { staffLang, tr } from '@/staff/i18n'

/**
 * Avtomatik xabarlar (server yuboradi): mijozga — buyurtma holati (uning tilida), xodimlarga — yangi buyurtma (chat
 * saqlangan paytdagi admin tilida). Namuna matnlari bilan.
 */
export default function NotificationsTab({ status }: { status: TelegramStatus }) {
  const db = useDb()
  const [chatId, setChatId] = useState(status.notify.staffChatId)
  const sample = useMemo<Order | undefined>(() => [...db.orders].reverse().find((order) => order.source === 'bot'), [db])

  const setNotify = (patch: Partial<TelegramStatus['notify']>) => telegramAction(() => telegramApi.updateSettings({ notify: patch }))

  const saveChat = async () => {
    // chat kiritilsa xabarnoma yoqiladi, tozalansa — o'chadi; xabarlar shu admin tanlagan tilda
    const result = await setNotify({ staffChatId: chatId.trim(), staff: !!chatId.trim(), staffLang: staffLang() })
    if (result !== null) showToast(tr('Saqlandi', 'Сохранено'))
  }

  const test = async () => {
    const target = chatId.trim()
    if (!target) return
    const text = sample
      ? `🔔 <b>${tr('Sinov', 'Тест')}</b>\n\n${staffNewOrderMessage(sample)}`
      : tr('🔔 Sinov xabari — bildirishnomalar ishlayapti', '🔔 Тестовое сообщение — уведомления работают')
    const result = await telegramAction(() => telegramApi.send(target, text), tr('Yuborilmadi', 'Не отправлено'))
    if (result !== null) showToast(tr('Sinov xabari yuborildi', 'Тестовое сообщение отправлено'))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={tr('Mijozga buyurtma holati', 'Статус заказа клиенту')}
          hint={tr(
            "Kassa holatni o'zgartirganda mijoz Telegram'da xabar oladi (o'z tilida)",
            'Когда касса меняет статус, клиент получает сообщение в Telegram (на своём языке)',
          )}
          actions={
            <Switch
              checked={status.notify.customers}
              onChange={(customers) => void setNotify({ customers })}
              label={tr('Mijozga xabar yuborish', 'Отправлять сообщения клиенту')}
            />
          }
        />
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {CUSTOMER_NOTIFY_STATUSES.map((status) => {
            // namuna xodim tilida (mijoz o'z tilida oladi)
            const preview = sample ? customerStatusMessage(db, { ...sample, status }, staffLang()) : null
            return (
              <div key={status} className="rounded border border-neutral-200 p-3">
                <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{ORDER_STATUS_LABEL[status]}</p>
                <p className="text-sm whitespace-pre-wrap text-neutral-700">{preview ? preview.replace(/<[^>]+>/g, '') : '—'}</p>
              </div>
            )
          })}
        </div>
        <p className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
          {tr(
            "Xabar Mini App orqali buyurtma bergan (Telegram ID si ma'lum) mijozlarga boradi. «Tayyorlanmoqda» bosqichi haqida xabar yuborilmaydi.",
            'Сообщения получают клиенты, оформившие заказ через Mini App (известен Telegram ID). Об этапе «Готовится» сообщение не отправляется.',
          )}
        </p>
      </Card>

      <Card>
        <CardHeader
          title={tr('Xodimlarga yangi buyurtma', 'Новый заказ сотрудникам')}
          hint={tr('Botga yangi buyurtma tushganda shu chatga xabar keladi', 'Когда в бот поступает новый заказ, в этот чат приходит сообщение')}
          actions={
            <Switch checked={status.notify.staff} onChange={(staff) => void setNotify({ staff })} label={tr('Xodimlarga xabar yuborish', 'Отправлять сообщения сотрудникам')} />
          }
        />
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end">
          <Field
            label="Chat ID"
            htmlFor="tg-staff-chat"
            hint={tr(
              "O'zingizning Telegram ID (botga /start yozing, keyin «Obunachilar» da 🔔 ni bosing) yoki guruh ID si (-100...)",
              'Ваш Telegram ID (напишите боту /start, затем нажмите 🔔 в «Подписчиках») или ID группы (-100...)',
            )}
            className="min-w-0 flex-1"
          >
            <input id="tg-staff-chat" value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="123456789" className={`${inputClass} font-mono`} />
          </Field>
          <div className="flex shrink-0 gap-2 sm:mb-[22px]">
            <button type="button" onClick={() => void test()} disabled={!chatId.trim()} className={`btn-ghost ${buttonClass}`}>
              <Send size={15} />
              {tr('Sinov', 'Тест')}
            </button>
            <button type="button" onClick={() => void saveChat()} disabled={chatId.trim() === status.notify.staffChatId} className={`btn-primary ${buttonClass}`}>
              <BellRing size={15} />
              {tr('Saqlash', 'Сохранить')}
            </button>
          </div>
        </div>
        {sample && (
          <div className="border-t border-neutral-200 px-4 py-3">
            <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{tr('Namuna', 'Пример')}</p>
            <p className="text-sm whitespace-pre-wrap text-neutral-700">{staffNewOrderMessage(sample).replace(/<[^>]+>/g, '')}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
