import type { Gender, Localized, LongevityLevel, SeasonPreset, SillageLevel } from './types'

/**
 * Mahsulot sahifasidagi "Когда носить", "Стойкость", "Шлейф" va "Пол" chiziqlari. Admin har bo'limdan bitta asosiy
 * qiymat tanlaydi — foizlar shu jadvallardan olinadi (backend kelganda mijozlar ovozidan hisoblash mumkin).
 */

export type Bar = { id: string; label: Localized; value: number }

// ───────────── Когда носить ─────────────

export const SEASON_KEYS = ['winter', 'spring', 'summer', 'autumn', 'day', 'night'] as const
export type SeasonKey = (typeof SEASON_KEYS)[number]

export const SEASON_LABELS: Record<SeasonKey, Localized> = {
  winter: { ru: 'Зима', uz: 'Qish' },
  spring: { ru: 'Весна', uz: 'Bahor' },
  summer: { ru: 'Лето', uz: 'Yoz' },
  autumn: { ru: 'Осень', uz: 'Kuz' },
  day: { ru: 'День', uz: 'Kunduz' },
  night: { ru: 'Вечер', uz: 'Kechqurun' },
}

export const SEASON_PRESETS: Record<SeasonPreset, { label: Localized; values: Record<SeasonKey, number> }> = {
  summer: { label: { ru: 'Лето · день', uz: 'Yoz · kunduz' }, values: { winter: 15, spring: 55, summer: 100, autumn: 35, day: 100, night: 30 } },
  spring: { label: { ru: 'Весна · день', uz: 'Bahor · kunduz' }, values: { winter: 25, spring: 100, summer: 65, autumn: 45, day: 90, night: 35 } },
  autumn: { label: { ru: 'Осень · вечер', uz: 'Kuz · kechqurun' }, values: { winter: 60, spring: 40, summer: 20, autumn: 100, day: 45, night: 85 } },
  winter: { label: { ru: 'Зима · вечер', uz: 'Qish · kechqurun' }, values: { winter: 100, spring: 30, summer: 10, autumn: 70, day: 35, night: 100 } },
  universal: { label: { ru: 'Круглый год', uz: 'Har qanday fasl' }, values: { winter: 70, spring: 85, summer: 75, autumn: 85, day: 85, night: 75 } },
  evening: { label: { ru: 'Вечерний выход', uz: 'Kechki chiqish' }, values: { winter: 70, spring: 45, summer: 40, autumn: 70, day: 25, night: 100 } },
}

/** fasl ranglari (ma'lumotnoma uslubida): qish — ko'k, bahor — yashil, yoz — qizil, kuz — to'q sariq */
export const SEASON_COLORS: Record<SeasonKey, string> = {
  winter: '#5ec8e5',
  spring: '#7ccf6b',
  summer: '#f28b82',
  autumn: '#f4b860',
  day: '#f59e0b',
  night: '#6b9ac4',
}

export function seasonBars(preset: SeasonPreset): Bar[] {
  const values = SEASON_PRESETS[preset].values
  return SEASON_KEYS.map((key) => ({ id: key, label: SEASON_LABELS[key], value: values[key] }))
}

// ───────────── Стойкость ─────────────

export const LONGEVITY_LEVELS: LongevityLevel[] = ['very_weak', 'weak', 'moderate', 'long', 'eternal']

export const LONGEVITY_LABELS: Record<LongevityLevel, Localized> = {
  very_weak: { ru: 'Очень слабая', uz: 'Juda kuchsiz' },
  weak: { ru: 'Слабая', uz: 'Kuchsiz' },
  moderate: { ru: 'Средняя', uz: "O'rtacha" },
  long: { ru: 'Стойкая', uz: 'Turg\'un' },
  eternal: { ru: 'Вечная', uz: 'Juda turg\'un' },
}

const LONGEVITY_VALUES: Record<LongevityLevel, number[]> = {
  very_weak: [70, 40, 20, 10, 5],
  weak: [30, 70, 35, 15, 5],
  moderate: [10, 30, 70, 35, 10],
  long: [5, 15, 35, 70, 30],
  eternal: [5, 10, 20, 40, 70],
}

export function longevityBars(level: LongevityLevel): Bar[] {
  return LONGEVITY_LEVELS.map((id, index) => ({ id, label: LONGEVITY_LABELS[id], value: LONGEVITY_VALUES[level][index] }))
}

// ───────────── Шлейф ─────────────

export const SILLAGE_LEVELS: SillageLevel[] = ['intimate', 'moderate', 'strong', 'enormous']

export const SILLAGE_LABELS: Record<SillageLevel, Localized> = {
  intimate: { ru: 'Интимный', uz: 'Yaqin masofa' },
  moderate: { ru: 'Средний', uz: "O'rtacha" },
  strong: { ru: 'Заметный', uz: 'Sezilarli' },
  enormous: { ru: 'Огромный', uz: 'Juda kuchli' },
}

const SILLAGE_VALUES: Record<SillageLevel, number[]> = {
  intimate: [70, 35, 15, 5],
  moderate: [30, 70, 35, 10],
  strong: [10, 35, 70, 30],
  enormous: [5, 15, 40, 70],
}

export function sillageBars(level: SillageLevel): Bar[] {
  return SILLAGE_LEVELS.map((id, index) => ({ id, label: SILLAGE_LABELS[id], value: SILLAGE_VALUES[level][index] }))
}

// ───────────── Пол ─────────────

export const GENDERS: Gender[] = ['female', 'male', 'unisex']

export const GENDER_LABELS: Record<Gender, Localized> = {
  female: { ru: 'Женский', uz: 'Ayollar' },
  male: { ru: 'Мужской', uz: 'Erkaklar' },
  unisex: { ru: 'Унисекс', uz: 'Uniseks' },
}

export const GENDER_COLORS: Record<Gender, string> = {
  female: '#ec4899',
  male: '#3b82f6',
  unisex: '#14b8a6',
}

/** foizlar yig'indisi 100 (bir xona aniqlikda) */
const GENDER_VALUES: Record<Gender, Record<Gender, number>> = {
  female: { female: 76.9, male: 7.7, unisex: 15.4 },
  male: { female: 7.7, male: 76.9, unisex: 15.4 },
  unisex: { female: 30.8, male: 23.1, unisex: 46.1 },
}

export function genderBars(gender: Gender): Bar[] {
  return GENDERS.map((id) => ({ id, label: GENDER_LABELS[id], value: GENDER_VALUES[gender][id] }))
}

// ───────────── Akkordlar ─────────────

/** n-akkord chizig'i uzunligi, %: 100, 88, 76... (kamida 30) */
export function accordWidth(index: number): number {
  return Math.max(30, 100 - index * 12)
}

/** Akkord foniga mos matn rangi. */
export function readableTextColor(background: string): '#000' | '#fff' {
  const hex = background.replace('#', '')
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  // taxminiy yorqinlik — 0.55 dan och fonda qora matn
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000' : '#fff'
}
