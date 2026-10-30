import { configureHttp, http } from '@/api/http'
import { closeDb, useDb } from '@/data/db'
import type { Role, User } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { SESSION_STORAGE_KEY } from '@/store/storageKeys'

/**
 * Kirgan xodim (PIN bilan, `POST /api/auth/login`): token va xodim. Har bir tabning o'z sessiyasi (sessionStorage):
 * bir tabda admin, boshqasida kassir bo'lib ishlash mumkin. Token eskirsa yoki xodim bloklansa (server 401) — chiqadi.
 */

export type SessionUser = Pick<User, 'id' | 'name' | 'role'>

interface Session {
  token: string
  user: SessionUser
}

function read(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as Session | null
    return value && typeof value.token === 'string' && value.user ? value : null
  } catch {
    return null
  }
}

const sessionStore = createStore<Session | null>(read())

function save(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // saqlash bloklangan — sessiya shu sahifa ochiq turguncha amal qiladi
  }
  sessionStore.set(session)
}

configureHttp({
  token: () => sessionStore.get()?.token ?? null,
  unauthorized: () => logout(),
})

/** PIN bilan kirish. Noto'g'ri bo'lsa — `ApiError` (`wrong_pin`, `too_many_attempts`, `network`). */
export async function login(pin: string): Promise<SessionUser> {
  const result = await http.post<Session>('/auth/login', { pin }, { token: null })
  save({ token: result.token, user: { id: result.user.id, name: result.user.name, role: result.user.role } })
  return result.user
}

export function logout(): void {
  save(null)
  closeDb()
}

export function sessionToken(): string | null {
  return sessionStore.get()?.token ?? null
}

/** Joriy xodim id si. */
export function currentUserId(): string | undefined {
  return sessionStore.get()?.user.id
}

/**
 * Kirgan xodim. Baza yuklangan bo'lsa — undagi yangi ismi va roli bilan (admin o'zgartirgan bo'lishi mumkin);
 * bloklangan xodimni server o'zi chiqaradi (keyingi so'rovda 401).
 */
export function useCurrentUser(): SessionUser | null {
  const session = useStore(sessionStore)
  const db = useDb()
  if (!session) return null
  const fresh = db.users.find((user) => user.id === session.user.id)
  return fresh ? { id: fresh.id, name: fresh.name, role: fresh.role } : session.user
}

/** Rol bo'yicha bosh sahifa: admin — dashboard, kassir — kassa. */
export function homeOf(role: Role): string {
  return role === 'admin' ? '/admin' : '/kassa'
}

/**
 * Kassaga admin ham kira oladi; adminga — faqat admin. Harf katta-kichikligiga qaramaydi ("/ADMIN" ham admin
 * bo'limi) — router'da xodim bo'limlari harfga sezgir bo'lsa ham, ruxsat tekshiruvi ikkinchi himoya bo'lib qoladi.
 */
export function canOpen(role: Role, path: string): boolean {
  return path.toLowerCase().startsWith('/admin') ? role === 'admin' : true
}

/**
 * Shu ilova ichidagi manzilmi: "/kassa/sale?x=1" — ha; "//example.com", "/\example.com", "https://..." — yo'q
 * (router tashqi manzilga o'tmaydi va xato sahifasini ko'rsatadi).
 */
export function isInternalPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false
  try {
    return new URL(path, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * Kirgandan keyingi manzil: `?next=` ichki, kirish sahifasining o'zi emas va rolga ruxsat etilgan bo'lsa — o'sha
 * (tekshirilgan, "/kassa/../admin" kabi qismlari yechilgan ko'rinishda), aks holda rol bosh sahifasi.
 */
export function nextPathFor(role: Role, next: string | null): string {
  if (!next || !isInternalPath(next)) return homeOf(role)
  const url = new URL(next, window.location.origin)
  const pathname = url.pathname.toLowerCase()
  if (pathname === '/login' || pathname.startsWith('/login/') || !canOpen(role, pathname)) return homeOf(role)
  return url.pathname + url.search + url.hash
}
