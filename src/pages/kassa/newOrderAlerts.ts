import { useEffect, useRef } from 'react'
import { useDb } from '@/data/db'
import { formatOrderNumber } from '@/lib/format'
import { showToast } from '@/lib/toast'
import { ruPlural, tr } from '@/staff/i18n'
import { createStore, useStore } from '@/store/createStore'

/**
 * Yangi bot buyurtmasi signali: mijoz ilovasidan buyurtma kelsa, server socket orqali xabar beradi va baza yangilanadi —
 * kassada toast, qisqa ovoz va navbatdagi kartochka belgilanadi (kassir ochguncha yoki holat o'zgarguncha).
 */

const freshStore = createStore<string[]>([])

export function useFreshOrderIds(): string[] {
  return useStore(freshStore)
}

export function clearFresh(orderId: string): void {
  const ids = freshStore.get()
  if (ids.includes(orderId)) freshStore.set(ids.filter((id) => id !== orderId))
}

let audio: AudioContext | null = null

function audioContext(): AudioContext | null {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume().catch(() => undefined)
    return audio
  } catch {
    return null
  }
}

/** Ikki notali qisqa "ding-dong". Brauzer ovozni foydalanuvchi bosmaguncha bloklasa — jim o'tadi. */
function beep(): void {
  const ctx = audioContext()
  if (!ctx || ctx.state !== 'running') return
  const start = ctx.currentTime
  ;[880, 1175].forEach((frequency, index) => {
    const at = start + index * 0.18
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(at)
    oscillator.stop(at + 0.17)
  })
}

/** KassaLayout ichida bir marta ishlaydi: yangi kelgan "Yangi" bot buyurtmalarini kuzatadi. */
export function useNewOrderWatcher(): void {
  const db = useDb()
  const known = useRef<Set<string> | null>(null)

  // ovoz konteksti birinchi bosishda "ochiladi" (autoplay cheklovi)
  useEffect(() => {
    const unlock = () => void audioContext()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    const botIds = db.orders.filter((order) => order.source === 'bot').map((order) => order.id)
    if (known.current === null) {
      known.current = new Set(botIds)
      return
    }
    const seen = known.current
    const fresh = db.orders.filter((order) => order.source === 'bot' && order.status === 'new' && !seen.has(order.id))
    botIds.forEach((id) => seen.add(id))
    if (fresh.length === 0) return
    freshStore.set([...freshStore.get(), ...fresh.map((order) => order.id)])
    const title =
      fresh.length === 1
        ? tr(
            `Yangi buyurtma ${formatOrderNumber(fresh[0].number)} — ${fresh[0].customerName}`,
            `Новый заказ ${formatOrderNumber(fresh[0].number)} — ${fresh[0].customerName}`,
          )
        : tr(
            `${fresh.length} ta yangi buyurtma`,
            `${fresh.length} ${ruPlural(fresh.length, 'новый заказ', 'новых заказа', 'новых заказов')}`,
          )
    // toast SweetAlert'siz (lib/toast) — kassirning ochiq dialogini (bekor qilish, "Chek chiqarish?") yopmaydi
    showToast(title, 'info')
    beep()
  }, [db])
}
