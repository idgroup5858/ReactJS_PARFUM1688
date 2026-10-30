/**
 * Qisqa xabar ("Saqlandi", "Yangi buyurtma #1203" ...) — o'z elementi bilan, SweetAlert'siz. SweetAlert bir vaqtda
 * faqat bitta oyna ko'rsatadi: toast u orqali chiqsa, ochiq turgan dialogni ("Chek chiqarish", "Baribir sotish",
 * "Bekor qilish"...) yopib yuboradi. Bu toast esa hech narsani yopmaydi — ochiq dialog ustida ham ko'rinadi.
 * Ko'rinishi — global.css dagi `.app-toast`.
 */

export type ToastIcon = 'success' | 'error' | 'info'

export type ToastOptions = {
  /** bottom-end — pastki o'ng burchak (kassa, admin); top — tepada, markazda (mijoz ilovasi) */
  position?: 'bottom-end' | 'top'
  /** ko'rinib turish vaqti, ms */
  duration?: number
}

const DURATION = 1600
/** bir vaqtda ko'pi bilan shuncha xabar — eskisi o'rnini yangisiga beradi */
const MAX_VISIBLE = 3

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

// lucide: circle-check, circle-x, info
const ICONS: Record<ToastIcon, string> = {
  success: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  error: svg('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
}

const regions = new Map<string, HTMLElement>()

/** Xabarlar joyi (har pozitsiyaga bittadan); ekran o'quvchilari uchun `aria-live`. */
function regionFor(position: NonNullable<ToastOptions['position']>): HTMLElement {
  let region = regions.get(position)
  if (!region || !region.isConnected) {
    region = document.createElement('div')
    region.className = `app-toasts app-toasts-${position}`
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    document.body.appendChild(region)
    regions.set(position, region)
  }
  return region
}

function dismiss(toast: HTMLElement): void {
  if (toast.dataset.leaving) return
  toast.dataset.leaving = '1'
  toast.classList.add('app-toast-leave')
  const remove = () => toast.remove()
  toast.addEventListener('animationend', remove, { once: true })
  // animatsiya o'chirilgan bo'lsa (prefers-reduced-motion) ham olib tashlansin
  window.setTimeout(remove, 250)
}

/** Pastki burchakdagi qisqa xabar ("Nusxalandi" va h.k.). Ochiq dialog va oynalarga tegmaydi. */
export function showToast(title: string, icon: ToastIcon = 'success', options: ToastOptions = {}): void {
  if (typeof document === 'undefined') return
  const region = regionFor(options.position ?? 'bottom-end')

  const toast = document.createElement('div')
  toast.className = `app-toast app-toast-${icon}`
  const iconBox = document.createElement('span')
  iconBox.className = 'app-toast-icon'
  iconBox.innerHTML = ICONS[icon]
  const text = document.createElement('span')
  text.className = 'app-toast-title'
  text.textContent = title
  toast.append(iconBox, text)
  // bosilsa — darhol yopiladi
  toast.addEventListener('click', () => dismiss(toast))
  region.appendChild(toast)

  const active = [...region.children].filter((item): item is HTMLElement => item instanceof HTMLElement && !item.dataset.leaving)
  active.slice(0, Math.max(0, active.length - MAX_VISIBLE)).forEach(dismiss)

  window.setTimeout(() => dismiss(toast), options.duration ?? DURATION)
}
