import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'

/**
 * Ustma-ust ochilgan oynalar (Modal, panel) navbati: Esc faqat eng ustidagisini yopadi. Masalan, kategoriya formasi
 * ichida "Rasm tanlash" ochiq bo'lsa, Esc faqat galereyani yopadi — forma va unga yozilgan ma'lumot joyida qoladi.
 *
 *   const layer = useEscapeLayer(onClose)
 *   return <LayerContext value={layer}>...</LayerContext>
 *
 * Context ichma-ich oynalarni bog'laydi: ota va ichidagi oyna bitta chizishda birga ochilsa ham (React avval ichki
 * effektni ishga tushiradi) ichkisi ustida turadi.
 */

export type Layer = { parent: Layer | null }

export const LayerContext = createContext<Layer | null>(null)

/** Ochilish tartibida; oxirgisi — eng ustidagi. */
const stack: Layer[] = []

function isInside(layer: Layer, ancestor: Layer): boolean {
  for (let current = layer.parent; current; current = current.parent) if (current === ancestor) return true
  return false
}

/**
 * Oynani navbatga qo'yadi va Esc ni ushlaydi. [onClose] `undefined` bo'lsa (yopilmaydigan oyna) Esc hech narsa
 * qilmaydi, lekin oyna baribir navbatda turadi — ostidagilar ham yopilmaydi.
 */
export function useEscapeLayer(onClose: (() => void) | undefined): Layer {
  const parent = useContext(LayerContext)
  const [layer] = useState<Layer>(() => ({ parent }))
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    // ichidagi oyna oldinroq qo'shilgan bo'lsa (bitta chizishda ochilgan) — undan pastga
    const childIndex = stack.findIndex((item) => isInside(item, layer))
    if (childIndex === -1) stack.push(layer)
    else stack.splice(childIndex, 0, layer)

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || stack[stack.length - 1] !== layer) return
      // SweetAlert dialogi ochiq — Esc uniki (u o'zi yopiladi)
      if (Swal.isVisible()) return
      const close = closeRef.current
      if (!close) return
      event.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const index = stack.indexOf(layer)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [layer])

  return layer
}
