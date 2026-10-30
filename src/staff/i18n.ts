import type { Lang, Localized } from '@/domain/types'
import { settingsStore, useSettings } from '@/store/settingsStore'

/**
 * Kassa va admin tili: o'zbekcha (asosiy) yoki ruscha — har bir xodim o'z qurilmasida tanlaydi (header'dagi UZ / RU).
 *
 * Matn ishlatiladigan joyning o'zida ikkala tilda yoziladi: `tr("Saqlash", "Сохранить")`. Tillar ikkita va
 * ko'payishi rejalashtirilmagan — kalitli lug'at o'rniga juftlik: matn kod yonida turadi, kalit nomi o'ylab
 * topilmaydi. `tr` joriy tilni chaqirilgan paytda o'qiydi, shuning uchun:
 * - modul darajasida (import paytida) chaqirilmaydi — faqat render, hodisa yoki funksiya ichida;
 * - kalit → yorliq jadvallari uchun `bilingual()` (har o'qilganda joriy tildagi matn).
 * Til almashganda admin / kassa sahifasi qayta chiziladi (layout'dagi `key`), header va sidebar — `useStaffLang` bilan.
 * Mijoz ilovasi bu fayldan foydalanmaydi (customer/i18n.ts).
 */

export function staffLang(): Lang {
  return settingsStore.get().lang
}

/** Komponentni til o'zgarishiga obuna qiladi (layout, header, sidebar, login sahifasi). */
export function useStaffLang(): Lang {
  return useSettings().lang
}

export function tr(uz: string, ru: string): string {
  return staffLang() === 'ru' ? ru : uz
}

/**
 * `{ kalit: [uz, ru] }` → `{ kalit: matn }`: qiymat har o'qilganda joriy tilda. `ORDER_STATUS_LABEL[status]` kabi
 * yozuvlar avvalgidek ishlaydi, faqat til almashganda ham to'g'ri matn beradi.
 */
export function bilingual<K extends string>(pairs: Record<K, readonly [uz: string, ru: string]>): Readonly<Record<K, string>> {
  const labels = {} as Record<K, string>
  for (const key of Object.keys(pairs) as K[]) {
    Object.defineProperty(labels, key, { enumerable: true, get: () => tr(pairs[key][0], pairs[key][1]) })
  }
  return labels
}

/** Ikki tilli kontent (kategoriya, nota, akkord nomi...) xodim tilida; bo'sh bo'lsa — ikkinchi tildagisi. */
export function loc(value: Localized): string {
  return staffLang() === 'ru' ? value.ru || value.uz : value.uz || value.ru
}

const ruPluralRules = new Intl.PluralRules('ru')

/** Ruscha son bilan otning shakli: ruPlural(5, 'аромат', 'аромата', 'ароматов') → "ароматов" (sonsiz). */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const form = ruPluralRules.select(n)
  return form === 'one' ? one : form === 'few' ? few : many
}
