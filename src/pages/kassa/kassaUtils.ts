import { useEffect, useState } from 'react'
import { statusAt } from '@/domain/orders'
import type { Flakon, ID, Order, OrderLine } from '@/domain/types'
import { addDays, todayKey } from '@/lib/dates'
import { NBSP, formatDate, formatNumber } from '@/lib/format'
import { ruPlural, tr } from '@/staff/i18n'

/** Kassa uchun umumiy yordamchilar: vaqt, slot, flakon tanlash, qator yozuvi. */

/** Har [intervalMs] da yangilanadigan "hozir" — "5 daq oldin" yozuvlari uchun. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

/** "hozirgina", "12 daq oldin", "2 soat oldin", "3 kun oldin" */
export function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return tr('hozirgina', 'только что')
  if (minutes < 60) return tr(`${minutes} daq oldin`, `${minutes} мин назад`)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return tr(`${hours} soat oldin`, `${hours} ч назад`)
  const days = Math.floor(hours / 24)
  return tr(`${days} kun oldin`, `${days} ${ruPlural(days, 'день', 'дня', 'дней')} назад`)
}

export type SlotDay = 'today' | 'tomorrow' | 'later' | 'past'

/** Mijoz tanlagan kun bugunga nisbatan. */
export function slotDay(date: string): SlotDay {
  const today = todayKey()
  if (date < today) return 'past'
  if (date === today) return 'today'
  if (date === addDays(today, 1)) return 'tomorrow'
  return 'later'
}

/** "Bugun 14:00", "Ertaga 10:00", "Indinga 18:00", "28.10.2026 12:00" */
export function slotLabel(slot: Order['slot']): string | null {
  if (!slot) return null
  const hour = `${String(slot.hour).padStart(2, '0')}:00`
  const today = todayKey()
  if (slot.date === today) return `${tr('Bugun', 'Сегодня')} ${hour}`
  if (slot.date === addDays(today, 1)) return `${tr('Ertaga', 'Завтра')} ${hour}`
  if (slot.date === addDays(today, 2)) return `${tr('Indinga', 'Послезавтра')} ${hour}`
  return `${formatDate(slot.date)} ${hour}`
}

/** Grammga mos tara: hajmi yetadigan eng kichik faol flakon (yo'q bo'lsa — eng kattasi). */
export function defaultFlakonId(flakons: Flakon[], grams: number): ID | undefined {
  const active = flakons.filter((flakon) => flakon.active).sort((a, b) => a.volumeMl - b.volumeMl)
  return (active.find((flakon) => flakon.volumeMl >= grams) ?? active[active.length - 1])?.id
}

/** Qator miqdori: "100 g" yoki "1 dona" */
export function formatQty(line: Pick<OrderLine, 'kind' | 'qty'>): string {
  return `${formatNumber(line.qty)}${NBSP}${line.kind === 'gram' ? tr('g', 'г') : tr('dona', 'шт.')}`
}

/** Qator summasi (tarasiz). */
export function lineSum(line: Pick<OrderLine, 'qty' | 'unitPrice'>): number {
  return line.qty * line.unitPrice
}

/** Buyurtma yopilgan vaqt: "Berildi" yoki "Bekor qilindi" hodisasi (bo'lmasa — yaratilgan vaqt). */
export function closedAt(order: Order): string {
  return order.status === 'cancelled' ? statusAt(order, 'cancelled') : statusAt(order, 'done')
}
