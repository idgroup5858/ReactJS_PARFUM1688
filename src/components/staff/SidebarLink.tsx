import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { formatNumber } from '@/lib/format'

type Props = {
  to: string
  label: string
  icon: ReactNode
  /** faqat aynan shu manzilda faol bo'lsin (ichki sahifalarda emas) */
  end?: boolean
  badge?: number
  /** badge rangi: muted — kulrang son, alert — aksent (yangi buyurtma, kam qoldiq) */
  badgeTone?: 'muted' | 'alert'
  onNavigate?: () => void
}

/** Sidebar bandi: faol bo'lsa aksent fonda va o'ngda strelka bilan (ReactJS_Language uslubi). */
export default function SidebarLink({ to, label, icon, end = false, badge, badgeTone = 'muted', onNavigate }: Props) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={label}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex w-[18px] shrink-0 justify-center ${isActive ? 'text-brand-700' : 'text-neutral-400'}`}>{icon}</span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={`shrink-0 rounded px-1.5 py-px text-[11px] font-semibold tabular-nums ${badgeTone === 'alert' ? 'bg-brand-fill text-white' : 'bg-neutral-100 text-neutral-500'}`}
            >
              {formatNumber(badge)}
            </span>
          )}
          {isActive && <ChevronRight size={14} className="shrink-0" />}
        </>
      )}
    </NavLink>
  )
}
