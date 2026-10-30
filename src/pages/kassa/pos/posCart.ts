import type { OrderLine, PaymentType } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'

/**
 * Kassadagi joriy chek (savat). Xotirada turadi — kassir "Buyurtmalar" tabiga o'tib qaytsa ham yo'qolmaydi
 * (sahifa yangilansa tozalanadi).
 */
export type PosCart = {
  lines: OrderLine[]
  phone: string
  name: string
  /** ism telefon bo'yicha bazadan qo'yilgan (kassir yozmagan) — raqam o'zgarsa almashtiriladi yoki tozalanadi */
  nameAuto: boolean
  payment: PaymentType | undefined
}

const EMPTY: PosCart = { lines: [], phone: '', name: '', nameAuto: false, payment: 'cash' }

export const posCart = createStore<PosCart>(EMPTY)

export function usePosCart(): PosCart {
  return useStore(posCart)
}

export function patchCart(patch: Partial<PosCart>): void {
  posCart.set({ ...posCart.get(), ...patch })
}

/** Qatorni qo'shadi yoki (shu id bilan bo'lsa) almashtiradi. */
export function putLine(line: OrderLine): void {
  const { lines } = posCart.get()
  const index = lines.findIndex((item) => item.id === line.id)
  patchCart({ lines: index === -1 ? [...lines, line] : lines.map((item) => (item.id === line.id ? line : item)) })
}

export function removeLine(id: string): void {
  patchCart({ lines: posCart.get().lines.filter((line) => line.id !== id) })
}

export function resetCart(): void {
  posCart.set(EMPTY)
}

/** Kiritilgan raqam: "90 123 45 67" → "998901234567" (9 raqam bo'lsa 998 qo'shiladi). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  return digits.length === 9 ? `998${digits}` : digits
}
