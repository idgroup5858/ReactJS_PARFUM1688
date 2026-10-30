import { useCustomer } from '@/customer/store'
import type { Lang } from '@/domain/types'
import { useStaffLang } from '@/staff/i18n'
import { isStaffPath } from '@/store/storageKeys'

/**
 * Xato sahifalari matnlari: kassa va admin — xodim tanlagan til, mijoz ilovasida — mijoz tanlagan til (RU / UZ),
 * chunki bu sahifalar layout'lardan tashqarida chiziladi.
 */

type ErrorTexts = {
  notFound: string
  toHome: string
  error: string
  errorHint: string
  unknownError: string
  reload: string
}

const TEXTS: Record<Lang, ErrorTexts> = {
  ru: {
    notFound: 'Страница не найдена',
    toHome: 'На главную',
    error: 'Произошла ошибка',
    errorHint: 'Попробуйте перезагрузить страницу.',
    unknownError: 'Неизвестная ошибка',
    reload: 'Перезагрузить',
  },
  uz: {
    notFound: 'Sahifa topilmadi',
    toHome: 'Bosh sahifaga',
    error: 'Xatolik yuz berdi',
    errorHint: "Sahifani qayta yuklab ko'ring.",
    unknownError: "Noma'lum xatolik",
    reload: 'Qayta yuklash',
  },
}

const STAFF: Record<Lang, ErrorTexts> = {
  ru: TEXTS.ru,
  uz: { ...TEXTS.uz, toHome: 'Bosh sahifa' },
}

/** [pathname] bo'yicha: xodimlar qismi — xodim tili, mijoz ilovasi — mijoz tili. */
export function useErrorTexts(pathname: string): ErrorTexts {
  const { lang } = useCustomer()
  const staffLang = useStaffLang()
  return isStaffPath(pathname) ? STAFF[staffLang] : TEXTS[lang]
}
