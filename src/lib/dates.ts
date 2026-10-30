const pad = (value: number) => String(value).padStart(2, '0')

/** Mahalliy sana "YYYY-MM-DD" (UTC emas — kun yarim tunda almashadi). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** "YYYY-MM-DD" + n kun */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, d + days))
}

/** ISO vaqtdan mahalliy sana kaliti */
export function dateKeyOf(iso: string): string {
  return toDateKey(new Date(iso))
}

/** Sana oralig'ida (ikkala chegara ham kiradi) */
export function inRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to
}
