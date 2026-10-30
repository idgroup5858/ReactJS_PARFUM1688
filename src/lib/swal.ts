import Swal, { type SweetAlertOptions } from 'sweetalert2'
import type { Lang } from '@/domain/types'
import { staffLang } from '@/staff/i18n'

const closeIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'

/** ReactJS_Recipe mixin'i: ✕ tugmasi, "Bekor qilish" chapda — oynalar ilovaning o'z modallariga o'xshaydi (global.css). */
function appMixin(close: string, cancel: string) {
  return Swal.mixin({
    showCloseButton: true,
    closeButtonHtml: closeIcon,
    closeButtonAriaLabel: close,
    reverseButtons: true,
    confirmButtonText: 'OK',
    cancelButtonText: cancel,
  })
}

const MIXINS: Record<Lang, typeof Swal> = {
  uz: appMixin('Yopish', 'Bekor qilish'),
  ru: appMixin('Закрыть', 'Отмена'),
}

/** SweetAlert2 kassa va admin uchun: standart tugma yozuvlari xodim tanlagan tilda (staff/i18n.ts). */
const AppSwal = {
  fire: (options: SweetAlertOptions) => MIXINS[staffLang()].fire(options),
  isVisible: () => Swal.isVisible(),
}

export default AppSwal
