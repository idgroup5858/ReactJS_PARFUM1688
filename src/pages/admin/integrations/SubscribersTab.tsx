import { BellRing, MessageSquare, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import Badge from '@/components/admin/Badge'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { subscriberName, telegramAction, telegramApi, type Subscriber, type TelegramData } from '@/integrations/telegram/store'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { staffLang, tr } from '@/staff/i18n'
import SendMessageModal from './SendMessageModal'
import { useOrdersByTelegramId } from './subscriberOrders'

type Filter = 'all' | 'active' | 'blocked' | 'buyers'

/** Botga /start bosgan yoki yozgan foydalanuvchilar: qidiruv, filtr, buyurtmalari, shaxsiy xabar. */
export default function SubscribersTab({ data }: { data: TelegramData }) {
  const { subscribers } = data
  const { notify } = data.status
  const ordersById = useOrdersByTelegramId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [writeTo, setWriteTo] = useState<Subscriber | null>(null)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^@/, '')
    return subscribers
      .filter((item) => {
        if (filter === 'active' && item.status !== 'active') return false
        if (filter === 'blocked' && item.status !== 'blocked') return false
        if (filter === 'buyers' && !ordersById.has(item.id)) return false
        if (!needle) return true
        return [subscriberName(item), item.username ?? '', String(item.id)].some((value) => value.toLowerCase().includes(needle))
      })
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
  }, [subscribers, filter, query, ordersById])
  const { pageItems, pagination } = usePagination(rows, `${filter}|${query}`)

  const setStaffChat = async (subscriber: Subscriber) => {
    // xabar shu admin tanlagan tilda keladi
    const result = await telegramAction(() =>
      telegramApi.updateSettings({ notify: { staffChatId: String(subscriber.id), staff: true, staffLang: staffLang() } }),
    )
    if (result === null) return
    showToast(
      tr(`Yangi buyurtmalar ${subscriberName(subscriber)} ga yuboriladi`, `Новые заказы будут приходить: ${subscriberName(subscriber)}`),
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder={tr('Ism, @username yoki ID', 'Имя, @username или ID')} />
        </div>
        <SegmentedControl<Filter>
          label={tr('Obunachilar filtri', 'Фильтр подписчиков')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: tr('Hammasi', 'Все') },
            { value: 'active', label: tr('Faol', 'Активные') },
            { value: 'blocked', label: tr('Bloklagan', 'Заблокировали') },
            { value: 'buyers', label: tr('Xaridorlar', 'Покупатели') },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Users}
            title={subscribers.length === 0 ? tr("Hali obunachi yo'q", 'Подписчиков пока нет') : tr('Hech kim topilmadi', 'Никто не найден')}
            message={
              subscribers.length === 0
                ? tr(
                    "Kimdir botga /start bossa yoki yozsa, shu yerda paydo bo'ladi (yangilanishlarni qabul qilish yoqilgan bo'lishi kerak).",
                    'Когда кто-то нажмёт /start или напишет боту, он появится здесь (получение обновлений должно быть включено).',
                  )
                : tr("Qidiruv yoki filtrni o'zgartiring.", 'Измените поиск или фильтр.')
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className={thClass}>{tr('Foydalanuvchi', 'Пользователь')}</th>
                <th className={thClass}>Telegram ID</th>
                <th className={thClass}>{tr('Til', 'Язык')}</th>
                <th className={thClass}>{tr("Qo'shilgan", 'Добавлен')}</th>
                <th className={thClass}>{tr('Oxirgi faollik', 'Последняя активность')}</th>
                <th className={thClass}>{tr('Xabarlar', 'Сообщения')}</th>
                <th className={thClass}>{tr('Buyurtmalar', 'Заказы')}</th>
                <th className={thClass}>{tr('Holat', 'Статус')}</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageItems.map((item) => {
                const orders = ordersById.get(item.id)
                const isStaffChat = notify.staffChatId === String(item.id)
                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className={tdClass}>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {item.firstName.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900">{subscriberName(item)}</p>
                          {item.username && (
                            <a href={`https://t.me/${item.username}`} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                              @{item.username}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`${tdClass} font-mono text-xs text-neutral-600`}>{item.id}</td>
                    <td className={`${tdClass} text-neutral-600 uppercase`}>{item.languageCode ?? '—'}</td>
                    <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDateTime(item.firstSeen)}</td>
                    <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatDateTime(item.lastSeen)}</td>
                    <td className={`${tdClass} tabular-nums`}>{formatNumber(item.messages)}</td>
                    <td className={`${tdClass} tabular-nums`}>
                      {orders ? (
                        <span>
                          {formatNumber(orders.count)} {tr('ta', 'шт.')} · <span className="text-neutral-500">{formatMoney(orders.total)}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-wrap gap-1">
                        {item.status === 'active' ? (
                          <Badge tone="success">{tr('Faol', 'Активен')}</Badge>
                        ) : (
                          <Badge tone="danger">{tr('Bloklagan', 'Заблокировал')}</Badge>
                        )}
                        {isStaffChat && <Badge tone="brand">{tr('Xodimlar chati', 'Чат сотрудников')}</Badge>}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <div className="flex justify-end gap-1">
                        <IconButton label={tr('Xabar yozish', 'Написать сообщение')} onClick={() => setWriteTo(item)}>
                          <MessageSquare size={15} />
                        </IconButton>
                        <IconButton
                          label={tr('Yangi buyurtmalar shu odamga kelsin', 'Присылать новые заказы этому человеку')}
                          active={isStaffChat}
                          onClick={() => void setStaffChat(item)}
                        >
                          <BellRing size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination {...pagination} />
      {writeTo && <SendMessageModal chatId={writeTo.id} name={subscriberName(writeTo)} onClose={() => setWriteTo(null)} />}
    </Card>
  )
}
