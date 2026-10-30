import { SearchX } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import EmptyState from '@/components/ui/EmptyState'
import { isStaffPath } from '@/store/storageKeys'
import { useErrorTexts } from './errorTexts'

/** Mavjud bo'lmagan manzil. Mijoz ilovasida — mijoz tilida (RU / UZ), xodimlarda — xodim tilida. */
export default function NotFoundPage() {
  const { pathname } = useLocation()
  const staff = isStaffPath(pathname)
  const text = useErrorTexts(pathname)
  return (
    <div className="p-4">
      <EmptyState
        icon={SearchX}
        title={text.notFound}
        message={pathname}
        action={
          <Link
            to={staff ? (pathname.startsWith('/kassa') ? '/kassa' : '/admin') : '/'}
            className="btn-primary flex h-9 items-center rounded px-5 text-xs font-semibold tracking-[0.12em] uppercase"
          >
            {text.toHome}
          </Link>
        }
      />
    </div>
  )
}
