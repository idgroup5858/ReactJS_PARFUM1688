import { useState } from 'react'
import { addDays, dateKeyOf, todayKey } from '@/lib/dates'
import { bilingual } from '@/staff/i18n'

/** Hisobot davri: tayyor variantlar yoki ixtiyoriy oraliq. Sanalar — mahalliy "YYYY-MM-DD", ikkala chegara ham kiradi. */
export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom'

export type Period = { preset: PeriodPreset; from: string; to: string }

export const PERIOD_LABEL = bilingual<PeriodPreset>({
  today: ['Bugun', 'Сегодня'],
  '7d': ['7 kun', '7 дней'],
  '30d': ['30 kun', '30 дней'],
  month: ['Bu oy', 'Этот месяц'],
  all: ['Hammasi', 'Все'],
  custom: ['Oraliq', 'Период'],
})

const ALL_FROM = '0000-01-01'
const ALL_TO = '9999-12-31'

export function presetRange(preset: Exclude<PeriodPreset, 'custom'>): { from: string; to: string } {
  const today = todayKey()
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
    case 'all':
      return { from: ALL_FROM, to: ALL_TO }
  }
}

/**
 * Yangi davr. "Oraliq"ga o'tganda oldingi davr sanalari saqlanadi (masalan, "7 kun" → o'sha 7 kun), faqat
 * "Hammasi"dan emas: uning chegaralari (0000-01-01 … 9999-12-31) sana maydoniga sig'maydi — oxirgi 30 kun olinadi.
 */
export function makePeriod(preset: PeriodPreset, previous?: Period): Period {
  if (preset === 'custom') {
    const today = todayKey()
    const keep = previous && previous.preset !== 'all'
    return { preset, from: keep ? previous.from : addDays(today, -29), to: keep ? previous.to : today }
  }
  return { preset, ...presetRange(preset) }
}

export function usePeriod(initial: PeriodPreset = '30d') {
  return useState<Period>(() => makePeriod(initial))
}

/** ISO vaqt (yoki "YYYY-MM-DD") davr ichidami. */
export function inPeriod(period: Period, value: string): boolean {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dateKeyOf(value)
  return key >= period.from && key <= period.to
}

/** Kunlar soni (ikkala chegara bilan); "Hammasi" uchun — 0. */
export function periodDays(period: Period): number {
  if (period.preset === 'all') return 0
  const [y1, m1, d1] = period.from.split('-').map(Number)
  const [y2, m2, d2] = period.to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000) + 1
}

/** Solishtirish uchun oldingi teng uzunlikdagi davr ("Hammasi" uchun — yo'q). */
export function previousPeriod(period: Period): Period | null {
  const days = periodDays(period)
  if (days <= 0) return null
  return { preset: 'custom', from: addDays(period.from, -days), to: addDays(period.from, -1) }
}
