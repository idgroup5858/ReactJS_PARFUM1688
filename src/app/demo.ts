import { useEffect, useState } from 'react'
import { http } from '@/api/http'
import type { Role } from '@/domain/types'

export type DemoPin = { name: string; role: Role; pin: string }

export interface DemoInfo {
  /** backend `DEMO=1` — "Demo ma'lumotlarni tiklash" ishlaydi */
  demo: boolean
  /** seed xodimlarining hali o'zgarmagan PIN'lari (kirish sahifasi uchun) */
  pins: DemoPin[]
}

/** Demo rejimi (`GET /api/demo`); javob kelguncha yoki xato bo'lsa — demo emas. */
export function useDemoInfo(): DemoInfo {
  const [info, setInfo] = useState<DemoInfo>({ demo: false, pins: [] })
  useEffect(() => {
    let cancelled = false
    http
      .get<DemoInfo>('/demo', undefined, { token: null })
      .then((value) => {
        if (!cancelled) setInfo(value)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  return info
}
