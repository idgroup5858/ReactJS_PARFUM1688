import { LayoutDashboard, LogOut, Moon, ShoppingBag, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { logout, useCurrentUser } from '@/app/session'
import { ROLE_LABEL } from '@/domain/labels'
import AppSwal from '@/lib/swal'
import { tr } from '@/staff/i18n'
import { setThemeMode } from '@/store/settingsStore'
import { useIsDark } from '@/theme/useIsDark'
import { HeaderButton, HeaderLink } from './HeaderButton'
import StaffLangSwitch from './StaffLangSwitch'

type Props = {
  /** chap qism: menyu tugmasi, brend, sahifa nomi yoki kassa tablari */
  children?: ReactNode
}

/**
 * Xodimlar qismining yuqori paneli (admin va kassa): chapda [children], o'ngda bo'limlar orasida o'tish
 * (admin ↔ kassa, faqat admin uchun), til (UZ / RU), mavzu tugmasi, xodim nomi va chiqish.
 */
export default function StaffHeader({ children }: Props) {
  const user = useCurrentUser()
  const dark = useIsDark()
  const navigate = useNavigate()

  const signOut = async () => {
    const result = await AppSwal.fire({
      title: tr('Chiqish', 'Выход'),
      text: tr('Tizimdan chiqmoqchimisiz?', 'Выйти из системы?'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: tr('Chiqish', 'Выйти'),
    })
    if (!result.isConfirmed) return
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-1">
        {user?.role === 'admin' && (
          <>
            <HeaderLink to="/admin" label={tr('Admin panel', 'Админ-панель')}>
              <LayoutDashboard size={18} />
              <span className="hidden md:inline">{tr('Admin', 'Админ')}</span>
            </HeaderLink>
            <HeaderLink to="/kassa" label={tr('Kassa', 'Касса')}>
              <ShoppingBag size={18} />
              <span className="hidden md:inline">{tr('Kassa', 'Касса')}</span>
            </HeaderLink>
            <span className="mx-1 hidden h-6 w-px bg-neutral-200 sm:block" />
          </>
        )}
        <span className="mr-1">
          <StaffLangSwitch />
        </span>
        <HeaderButton
          label={dark ? tr("Yorug' rejimga o'tish", 'Светлая тема') : tr("Qorong'i rejimga o'tish", 'Тёмная тема')}
          onClick={() => setThemeMode(dark ? 'light' : 'dark')}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </HeaderButton>
        {user && (
          <div className="ml-1 hidden min-w-0 text-right leading-tight sm:block">
            <p className="max-w-40 truncate text-sm font-semibold text-neutral-900">{user.name}</p>
            <p className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{ROLE_LABEL[user.role]}</p>
          </div>
        )}
        <HeaderButton label={tr('Chiqish', 'Выйти')} onClick={() => void signOut()}>
          <LogOut size={18} />
        </HeaderButton>
      </div>
    </header>
  )
}
