import { BellRing, Inbox, Megaphone, Settings2, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { onServerChange } from '@/api/realtime'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { refreshTelegram, useTelegram, type TelegramData } from '@/integrations/telegram/store'
import { dateKeyOf, todayKey } from '@/lib/dates'
import { formatNumber } from '@/lib/format'
import { tr } from '@/staff/i18n'
import BotSettingsTab from './BotSettingsTab'
import BroadcastTab from './BroadcastTab'
import ConnectionCard from './ConnectionCard'
import InboxTab from './InboxTab'
import NotificationsTab from './NotificationsTab'
import SubscribersTab from './SubscribersTab'
import { useOrdersByTelegramId } from './subscriberOrders'

type Section = 'subscribers' | 'inbox' | 'broadcast' | 'bot' | 'notify'

/**
 * Admin → Sozlamalar → Integratsiya: Telegram botni ulash, kuzatish va boshqarish. Holat serverdan; yangi xabar,
 * obunachi yoki rassilka jarayoni socket orqali keladi (`changed: telegram`).
 */
export default function TelegramIntegration() {
  const data = useTelegram()
  const [section, setSection] = useState<Section>('subscribers')

  useEffect(() => {
    void refreshTelegram()
    return onServerChange((scopes) => {
      if (scopes.includes('telegram') || scopes.includes('all')) void refreshTelegram()
    })
  }, [])

  if (!data) return <p className="py-12 text-center text-sm text-neutral-500">{tr('Yuklanmoqda…', 'Загрузка…')}</p>
  const connected = data.status.connected

  return (
    <div className="space-y-4">
      <ConnectionCard status={data.status} />
      {connected && (
        <>
          <Stats data={data} />
          <SegmentedControl<Section>
            label={tr("Bot bo'limlari", 'Разделы бота')}
            value={section}
            onChange={setSection}
            options={[
              { value: 'subscribers', label: <TabLabel icon={<Users size={14} />} text={tr('Obunachilar', 'Подписчики')} /> },
              { value: 'inbox', label: <TabLabel icon={<Inbox size={14} />} text={tr('Xabarlar', 'Сообщения')} /> },
              { value: 'broadcast', label: <TabLabel icon={<Megaphone size={14} />} text={tr('Rassilka', 'Рассылка')} /> },
              { value: 'bot', label: <TabLabel icon={<Settings2 size={14} />} text={tr('Bot sozlamalari', 'Настройки бота')} /> },
              { value: 'notify', label: <TabLabel icon={<BellRing size={14} />} text={tr('Bildirishnomalar', 'Уведомления')} /> },
            ]}
          />
          {section === 'subscribers' && <SubscribersTab data={data} />}
          {section === 'inbox' && <InboxTab inbox={data.inbox} />}
          {section === 'broadcast' && <BroadcastTab data={data} />}
          {section === 'bot' && <BotSettingsTab status={data.status} />}
          {section === 'notify' && <NotificationsTab status={data.status} />}
        </>
      )}
    </div>
  )
}

function TabLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <>
      {icon}
      {text}
    </>
  )
}

/** Bot ko'rsatkichlari: obunachilar, faol, bloklagan, bugun qo'shilgan, xaridorlar, bugungi xabarlar. */
function Stats({ data }: { data: TelegramData }) {
  const { subscribers, inbox } = data
  const ordersById = useOrdersByTelegramId()
  const stats = useMemo(() => {
    const today = todayKey()
    return [
      { label: tr('Obunachilar', 'Подписчики'), value: subscribers.length },
      { label: tr('Faol', 'Активные'), value: subscribers.filter((item) => item.status === 'active').length },
      { label: tr('Botni bloklagan', 'Заблокировали бота'), value: subscribers.filter((item) => item.status === 'blocked').length },
      { label: tr("Bugun qo'shilgan", 'Новые за сегодня'), value: subscribers.filter((item) => dateKeyOf(item.firstSeen) === today).length },
      { label: tr('Xaridorlar', 'Покупатели'), value: subscribers.filter((item) => ordersById.has(item.id)).length },
      { label: tr('Bugungi xabarlar', 'Сообщения за сегодня'), value: inbox.filter((item) => item.direction === 'in' && dateKeyOf(item.at) === today).length },
    ]
  }, [subscribers, inbox, ordersById])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((item) => (
        <div key={item.label} className="rounded border border-neutral-200 bg-white px-4 py-3">
          <p className="truncate text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{formatNumber(item.value)}</p>
        </div>
      ))}
    </div>
  )
}
