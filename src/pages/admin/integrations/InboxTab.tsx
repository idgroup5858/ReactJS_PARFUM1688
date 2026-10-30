import { ArrowDownLeft, ArrowUpRight, Inbox, Reply } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { usePagination } from '@/components/ui/usePagination'
import type { InboxMessage } from '@/integrations/telegram/store'
import { formatDateTime } from '@/lib/format'
import { tr } from '@/staff/i18n'
import SendMessageModal from './SendMessageModal'

type Direction = 'all' | 'in' | 'out'

/** Botga kelgan va bot yuborgan xabarlar (serverdagi oxirgi 500 tasi), javob berish. */
export default function InboxTab({ inbox }: { inbox: InboxMessage[] }) {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState<Direction>('in')
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return inbox
      .filter((item) => (direction === 'all' || item.direction === direction) && (!needle || `${item.name} ${item.text}`.toLowerCase().includes(needle)))
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [inbox, direction, query])
  const { pageItems, pagination } = usePagination(rows, `${direction}|${query}`, 15)

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder={tr("Ism yoki matn bo'yicha", 'По имени или тексту')} />
        </div>
        <SegmentedControl<Direction>
          label={tr("Xabarlar yo'nalishi", 'Направление сообщений')}
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'in', label: tr('Kelgan', 'Входящие') },
            { value: 'out', label: tr('Yuborilgan', 'Исходящие') },
            { value: 'all', label: tr('Hammasi', 'Все') },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Inbox}
            title={tr("Xabar yo'q", 'Сообщений нет')}
            message={tr("Foydalanuvchilar botga yozgan xabarlar shu yerda ko'rinadi.", 'Здесь появятся сообщения, которые пользователи пишут боту.')}
          />
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {pageItems.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.direction === 'in' ? 'bg-sky-50 text-sky-700' : 'bg-brand-50 text-brand-700'}`}
                title={item.direction === 'in' ? tr('Kelgan', 'Входящее') : tr('Yuborilgan', 'Исходящее')}
              >
                {item.direction === 'in' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-neutral-900">{item.direction === 'in' ? item.name : `${tr('Bot', 'Бот')} → ${item.name}`}</span>
                  <span className="text-xs text-neutral-400 tabular-nums">{formatDateTime(item.at)}</span>
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-wrap text-neutral-700">{item.text}</p>
              </div>
              {item.direction === 'in' && (
                <IconButton label={tr('Javob berish', 'Ответить')} onClick={() => setReplyTo(item)}>
                  <Reply size={15} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination {...pagination} />
      {replyTo && <SendMessageModal chatId={replyTo.chatId} name={replyTo.name} onClose={() => setReplyTo(null)} />}
    </Card>
  )
}
