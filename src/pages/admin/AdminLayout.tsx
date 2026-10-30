import { PanelLeft } from 'lucide-react'
import { useState } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import DataGate from '@/components/DataGate'
import { HeaderButton } from '@/components/staff/HeaderButton'
import RequireRole from '@/components/staff/RequireRole'
import StaffHeader from '@/components/staff/StaffHeader'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { tr, useStaffLang } from '@/staff/i18n'
import AdminSidebar from './AdminSidebar'

/**
 * Admin qobig'i (ReactJS_Language AppLayout): kompyuterda sidebar yon tomonda turadi va yashirilishi mumkin,
 * telefonda esa qora fon ustida ochilib, band tanlanganda yopiladi.
 */
export default function AdminLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const lang = useStaffLang()

  const sidebarOpen = isDesktop ? desktopOpen : mobileOpen
  const toggleSidebar = () => (isDesktop ? setDesktopOpen((open) => !open) : setMobileOpen((open) => !open))
  const closeOnMobile = () => {
    if (!isDesktop) setMobileOpen(false)
  }

  return (
    <RequireRole>
      <DataGate mode="staff">
        <div className="flex min-h-screen bg-page text-neutral-900">
          {!isDesktop && mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30" />}
          {sidebarOpen && <AdminSidebar onNavigate={closeOnMobile} />}

          <div className="flex min-w-0 flex-1 flex-col">
            <StaffHeader>
              <HeaderButton label={tr('Menyu', 'Меню')} onClick={toggleSidebar}>
                <PanelLeft size={18} />
              </HeaderButton>
            </StaffHeader>
            <main className="flex-1 p-4 sm:p-6">
              {/* til almashganda sahifa yangi tilda qayta chiziladi (tr() joriy tilni render paytida o'qiydi) */}
              <div key={`${lang}:${pathname}`} className="page-enter">
                <Outlet />
              </div>
            </main>
          </div>
          <ScrollRestoration />
        </div>
      </DataGate>
    </RequireRole>
  )
}
