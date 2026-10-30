import { Sparkle } from 'lucide-react'
import { APP_NAME } from '@/app/appInfo'

/** ✦ PARFUM1688 — xodimlar qismi sidebar'i, header'i va kirish oynasida. */
export default function Brand({ suffix }: { suffix?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2 select-none">
      <Sparkle size={18} strokeWidth={2.25} className="shrink-0 fill-current text-brand-700" />
      <span className="truncate font-brand text-lg leading-none font-semibold tracking-[0.06em] text-neutral-900">{APP_NAME}</span>
      {suffix && <span className="truncate text-[10px] font-bold tracking-[0.2em] text-brand-700 uppercase">{suffix}</span>}
    </span>
  )
}
