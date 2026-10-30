import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Props = {
  title: string
  /** o'ngdagi "Все →" havolasi */
  to?: string
  linkLabel?: string
  extra?: ReactNode
}

/** Bo'lim sarlavhasi: qalin, harflari ochiq yozilgan nom + o'ngda havola (namunadagi "КАТЕГОРИИ   Все →"). */
export default function SectionTitle({ title, to, linkLabel, extra }: Props) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-[0.08em] text-neutral-900 uppercase">{title}</h2>
      {to && linkLabel && (
        <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
          {linkLabel}
          <ArrowRight size={15} />
        </Link>
      )}
      {extra}
    </div>
  )
}
