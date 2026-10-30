import AppSwal from '@/lib/swal'
import { tr } from '@/staff/i18n'

/** O'chirish kabi qaytarib bo'lmaydigan amal oldidan so'rash. */
export async function confirmDanger(title: string, text: string, confirmButtonText = tr("O'chirish", 'Удалить')): Promise<boolean> {
  const result = await AppSwal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText })
  return result.isConfirmed
}

/** Amalni bajarib bo'lmasligini tushuntirish (masalan, ishlatilayotgan yozuvni o'chirish). */
export function explainBlocked(title: string, text: string): void {
  void AppSwal.fire({ title, text, icon: 'info', confirmButtonText: tr('Tushunarli', 'Понятно') })
}

/** Xatolar ro'yxati bilan ogohlantirish (forma tekshiruvi). */
export function showErrors(title: string, errors: string[]): void {
  const items = errors.map((error) => `<li>${error.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)}</li>`)
  void AppSwal.fire({
    title,
    html: `<ul style="list-style:disc;padding-left:1.1rem;margin:0">${items.join('')}</ul>`,
    icon: 'warning',
    confirmButtonText: tr('Tushunarli', 'Понятно'),
  })
}
