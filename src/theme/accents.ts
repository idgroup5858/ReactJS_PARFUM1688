/** Aksent ranglari — sozlamalardagi palitra (ReactJS_Language / ReactJS_Recipe palitrasi). */
export type AccentColors = {
  /** asosiy tus: yorug' rejimda tugmalar, aksent matn va faol holatlar (ustidagi oq matn o'qilishi kerak) */
  color: string
  /** qorong'i rejimdagi aksent matn uchun och tus */
  ink: string
  /** `color` qorong'i fonda ajralib turmasa, qorong'i rejimdagi tugma rangi */
  fillDark?: string
}

export type Accent = AccentColors & {
  id: string
  /** o'zbekcha nom; ruschasi — [nameRu] (palitra xodim tilida ko'rsatiladi) */
  name: string
  nameRu: string
}

/** PARFUM1688 brend rangi (zumrad) — global.css dagi `:root` qiymatlari ham shu. */
export const DEFAULT_ACCENT_ID = 'emerald'

export const ACCENTS: Accent[] = [
  { id: 'bordo', name: 'Bordo', nameRu: 'Бордо', color: '#6b0f2a', ink: '#e58ea6', fillDark: '#8f2246' },
  { id: 'red', name: 'Qizil', nameRu: 'Красный', color: '#b91c1c', ink: '#fca5a5' },
  { id: 'pink', name: 'Pushti', nameRu: 'Розовый', color: '#be185d', ink: '#f9a8d4' },
  { id: 'purple', name: 'Binafsha', nameRu: 'Фиолетовый', color: '#7e22ce', ink: '#d8b4fe' },
  { id: 'indigo', name: 'Siyohrang', nameRu: 'Индиго', color: '#4338ca', ink: '#a5b4fc' },
  { id: 'flag', name: "Ko'k", nameRu: 'Синий', color: '#0039a6', ink: '#8ab0ff', fillDark: '#2353c2' },
  { id: 'sky', name: 'Osmon', nameRu: 'Небесный', color: '#0369a1', ink: '#7dd3fc' },
  { id: 'teal', name: 'Feruza', nameRu: 'Бирюзовый', color: '#0f766e', ink: '#5eead4' },
  { id: 'emerald', name: 'Zumrad', nameRu: 'Изумрудный', color: '#047857', ink: '#6ee7b7' },
  { id: 'green', name: 'Yashil', nameRu: 'Зелёный', color: '#15803d', ink: '#86efac' },
  { id: 'olive', name: 'Zaytun', nameRu: 'Оливковый', color: '#4d7c0f', ink: '#bfd88a' },
  { id: 'gold', name: 'Oltin', nameRu: 'Золотой', color: '#a16207', ink: '#f2cc5c' },
  { id: 'orange', name: "To'q sariq", nameRu: 'Оранжевый', color: '#c2410c', ink: '#fdba74' },
  { id: 'brown', name: 'Jigarrang', nameRu: 'Коричневый', color: '#7c4a2b', ink: '#e2bc9b' },
  { id: 'slate', name: 'Grafit', nameRu: 'Графит', color: '#334155', ink: '#cbd5e1', fillDark: '#475569' },
  { id: 'black', name: 'Qora', nameRu: 'Чёрный', color: '#262626', ink: '#e5e5e5', fillDark: '#404040' },
]

/** Standart bo'lmagan rang tanlanganda <html> ga (data-accent bilan birga) qo'yiladigan CSS o'zgaruvchilari. */
export const ACCENT_VAR_NAMES = ['--accent', '--accent-ink', '--accent-fill-dark']

export function accentVars(accent: AccentColors): Record<string, string> {
  const vars: Record<string, string> = { '--accent': accent.color, '--accent-ink': accent.ink }
  if (accent.fillDark) vars['--accent-fill-dark'] = accent.fillDark
  return vars
}

export function findAccent(id: string | undefined): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0]
}
