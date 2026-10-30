import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { SERVER_URL } from './http'

/**
 * Jonli yangilanish (Socket.IO): server faqat "o'zgardi" xabarini yuboradi, buyruqlar — REST. Xabar kelsa yoki qayta
 * ulansa ma'lumot REST'dan qaytadan olinadi — uzilish paytidagi xabarlar yo'qolgan bo'lishi mumkin.
 *
 *  - `{ token }` — xodim (kassa, admin): `order` (buyurtma to'liq), `changed` ({ scopes });
 *  - `{ customerToken }` — mijoz ilovasi: o'z buyurtmalari (`order`) va `catalog`;
 *  - `{}` — mehmon (hali buyurtma bermagan mijoz): faqat `catalog`.
 */
export type SocketAuth = { token: string } | { customerToken: string } | Record<string, never>

const changeListeners = new Set<(scopes: string[]) => void>()

/** Serverdagi `changed` voqeasi (components/DataGate uzatadi) — bazadan tashqari ma'lumot (Telegram) uchun. */
export function onServerChange(listener: (scopes: string[]) => void): () => void {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

export function emitServerChange(scopes: string[]): void {
  changeListeners.forEach((listener) => listener(scopes))
}

interface Handlers {
  /** ulandi yoki qayta ulandi — hamma narsani qayta olish vaqti */
  onReady?: () => void
  onOrder?: (order: unknown) => void
  onChanged?: (scopes: string[]) => void
  onCatalog?: () => void
  /** server ulanishni rad etdi (token eskirgan, xodim bloklangan) */
  onAuthError?: () => void
}

export function useRealtime(auth: SocketAuth | null, handlers: Handlers): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef(handlers)
  useLayoutEffect(() => {
    handlersRef.current = handlers
  })
  const authKey = auth ? JSON.stringify(auth) : null

  useEffect(() => {
    if (authKey === null) return
    const socket = io(SERVER_URL || window.location.origin, { auth: JSON.parse(authKey) as SocketAuth, transports: ['websocket'] })
    socket.on('ready', () => {
      setConnected(true)
      handlersRef.current.onReady?.()
    })
    socket.on('order', (order: unknown) => handlersRef.current.onOrder?.(order))
    socket.on('changed', (payload: { scopes?: string[] }) => handlersRef.current.onChanged?.(payload.scopes ?? []))
    socket.on('catalog', () => handlersRef.current.onCatalog?.())
    socket.on('disconnect', () => setConnected(false))
    socket.on('auth_error', () => {
      socket.disconnect()
      setConnected(false)
      handlersRef.current.onAuthError?.()
    })
    return () => {
      socket.disconnect()
      setConnected(false)
    }
  }, [authKey])

  return { connected }
}
