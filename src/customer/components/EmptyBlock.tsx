import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  title: string
  message?: string
  action?: ReactNode
}

/** Bo'sh holat (savat, sevimlilar, qidiruv natijasi) — uzuq chiziqli oq blok. */
export default function EmptyBlock({ icon: Icon, title, message, action }: Props) {
  return (
    <div className="rounded border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
      <Icon className="mx-auto mb-3 text-neutral-300" size={40} strokeWidth={1.5} />
      <p className="text-base font-semibold text-neutral-800">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
