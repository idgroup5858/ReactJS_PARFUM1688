import { showToast } from '@/lib/toast'

/**
 * Yuqoridagi qisqa xabar — pastki menyu va "В корзину" panelini yopmasin. SweetAlert'siz (lib/toast.ts): ochiq
 * dialogni yopib yubormaydi.
 */
export function customerToast(title: string, icon: 'success' | 'error' | 'info' = 'success'): void {
  showToast(title, icon, { position: 'top' })
}
