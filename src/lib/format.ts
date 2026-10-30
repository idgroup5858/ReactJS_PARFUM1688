import { tr } from '@/staff/i18n'

/**
 * Uzilmaydigan bo'shliq: raqam guruhlari orasida va raqam bilan birlik orasida — tor joyda "1 490 / сум" bo'lib ikki
 * qatorga bo'linmasin.
 */
export const NBSP = ' '

/** 1234567 → "1 234 567" */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  const fixed = maxFractionDigits > 0 ? Number(value.toFixed(maxFractionDigits)) : Math.round(value)
  const [int, frac] = String(Math.abs(fixed)).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${fixed < 0 ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`
}

/** Admin va kassa: "1 490 000 so'm" / "1 490 000 сум" (xodim tili). Mijoz ilovasi o'z tilidagi birlikni beradi. */
export function formatMoney(value: number, unit = tr("so'm", 'сум')): string {
  return `${formatNumber(value)}${NBSP}${unit}`
}

/** Diagramma o'qlari uchun qisqa son: 1 250 000 → "1,3 mln" / "1,3 млн", 850 000 → "850 ming" / "850 тыс.". */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)}${NBSP}${tr('mlrd', 'млрд')}`
  if (Math.abs(value) >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}${NBSP}${tr('mln', 'млн')}`
  if (Math.abs(value) >= 1_000) return `${formatNumber(value / 1_000)}${NBSP}${tr('ming', 'тыс.')}`
  return formatNumber(value)
}

/** Buyurtma raqami: 7 → "#0007" — kassa, admin, chek va mijoz ilovasida bir xil. */
export function formatOrderNumber(number: number): string {
  return `#${String(number).padStart(4, '0')}`
}

/** Hujjat raqami: ("PR", 12) → "PR-0012" */
export function formatDocNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(4, '0')}`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "14:05" */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "23.10.2026" — ISO vaqt yoki "YYYY-MM-DD" */
export function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}.${m}.${y}`
  }
  const date = new Date(value)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

/** "23.10.2026 14:05" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

/** "+998 90 123 45 67" — 12 raqamli O'zbekiston raqami; boshqasi o'zgarishsiz */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 12 || !digits.startsWith('998')) return phone
  return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
}
