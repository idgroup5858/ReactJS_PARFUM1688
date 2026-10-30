import { ClipboardList, History, ShoppingCart } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import DataGate from '@/components/DataGate'
import Brand from '@/components/staff/Brand'
import RequireRole from '@/components/staff/RequireRole'
import StaffHeader from '@/components/staff/StaffHeader'
import { useDb } from '@/data/db'
import { ACTIVE_STATUSES } from '@/domain/orders'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr, useStaffLang } from '@/staff/i18n'
import { useNewOrderWatcher } from './newOrderAlerts'

/**
 * Kassa tabi. Planshet enida (sm–lg) brend, uchala yorliq va xodim nomi sig'maydi — u yerda faqat ochiq tabning
 * yorlig'i yoziladi, qolganlari belgi (va title); lg dan hammasi to'liq, sm dan torida faqat belgilar.
 */
function Tab({ to, label, icon, badge, end = false }: { to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      // yorliq yashirin bo'lsa ham nomi o'qiladi (aks holda faqat badge soni qolardi)
      aria-label={badge ? `${label} · ${badge}` : label}
      className={({ isActive }) =>
        `flex h-9 shrink-0 items-center gap-2 rounded px-2.5 text-sm font-semibold whitespace-nowrap transition-colors sm:px-3 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          <span className={isActive ? 'hidden sm:inline' : 'hidden lg:inline'}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="rounded bg-brand-fill px-1.5 py-px text-[11px] font-bold text-white tabular-nums">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

/** Kassa ichi: yangi buyurtma kuzatuvchisi faqat xodim kirgandan keyin ishlaydi. */
function KassaShell() {
  const lang = useStaffLang()
  useDocumentTitle(tr('Kassa', 'Касса'))
  useNewOrderWatcher()
  const db = useDb()
  const { pathname } = useLocation()
  const activeBot = useMemo(() => db.orders.filter((order) => order.source === 'bot' && ACTIVE_STATUSES.includes(order.status)).length, [db])

  return (
    <div className="flex min-h-screen flex-col bg-page text-neutral-900">
      <StaffHeader>
        <Link to="/kassa" className="mr-2 hidden shrink-0 lg:block">
          <Brand suffix={tr('Kassa', 'Касса')} />
        </Link>
        <nav className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
          <Tab to="/kassa" end label={tr('Buyurtmalar', 'Заказы')} icon={<ClipboardList size={18} />} badge={activeBot} />
          <Tab to="/kassa/sale" label={tr('Sotuv', 'Продажа')} icon={<ShoppingCart size={18} />} />
          <Tab to="/kassa/history" label={tr('Bugungi savdo', 'Продажи за сегодня')} icon={<History size={18} />} />
        </nav>
      </StaffHeader>
      <main className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        {/* til almashganda sahifa yangi tilda qayta chiziladi (chek / savat store'da — yo'qolmaydi) */}
        <div key={`${lang}:${pathname}`} className="page-enter flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/** Kassa qobig'i: sidebar yo'q, yuqorida tablar — Buyurtmalar navbati, Sotuv (POS), Bugungi savdo. */
export default function KassaLayout() {
  return (
    <RequireRole>
      <DataGate mode="staff">
        <KassaShell />
      </DataGate>
    </RequireRole>
  )
}
