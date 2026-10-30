import {
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Flower2,
  GalleryHorizontal,
  LayoutDashboard,
  MessageSquare,
  PackageMinus,
  PackagePlus,
  Palette,
  Settings,
  Shapes,
  SprayCan,
  Tag,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import Brand from '@/components/staff/Brand'
import SidebarLink from '@/components/staff/SidebarLink'
import { useDb } from '@/data/db'
import { ACTIVE_STATUSES } from '@/domain/orders'
import { lowStockKeys } from '@/domain/stock'
import { tr } from '@/staff/i18n'

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 truncate px-3 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{title}</p>
      <nav className="space-y-0.5">{children}</nav>
    </div>
  )
}

/** Admin chap paneli. Telefonda ustma-ust ochiladi va band tanlanganda yopiladi ([onNavigate]). */
export default function AdminSidebar({ onNavigate }: { onNavigate: () => void }) {
  const db = useDb()
  const counts = useMemo(
    () => ({
      activeOrders: db.orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length,
      // faqat sotuvdagi pozitsiyalar: nofaol atir / tara 0 qolsa ham abadiy ogohlantirish bo'lib turmaydi
      lowStock: lowStockKeys(db).length,
    }),
    [db],
  )
  const link = (to: string, label: string, icon: ReactNode, extra: { end?: boolean; badge?: number; badgeTone?: 'muted' | 'alert' } = {}) => (
    <SidebarLink to={to} label={label} icon={icon} onNavigate={onNavigate} {...extra} />
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-[248px] shrink-0 flex-col border-r border-neutral-200 bg-white lg:sticky lg:top-0">
      {/* px-4: kirillcha "АДМИН" lotinchadan kengroq — px-5 da logo kesilardi */}
      <Link to="/admin" onClick={onNavigate} className="flex h-14 shrink-0 items-center border-b border-neutral-200 px-4">
        <Brand suffix={tr('Admin', 'Админ')} />
      </Link>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <SidebarSection title={tr('Asosiy', 'Основное')}>
          {link('/admin', tr('Dashboard', 'Дашборд'), <LayoutDashboard size={18} />, { end: true })}
          {link('/admin/orders', tr('Buyurtmalar', 'Заказы'), <ClipboardList size={18} />, { badge: counts.activeOrders, badgeTone: 'alert' })}
          {link('/admin/customers', tr('Mijozlar', 'Клиенты'), <Users size={18} />)}
        </SidebarSection>
        <SidebarSection title={tr('Katalog', 'Каталог')}>
          {link('/admin/products', tr('Atirlar', 'Ароматы'), <SprayCan size={18} />, { badge: db.products.length })}
          {link('/admin/brands', tr('Brendlar', 'Бренды'), <Tag size={18} />)}
          {link('/admin/categories', tr('Kategoriyalar', 'Категории'), <Shapes size={18} />)}
          {link('/admin/notes', tr('Notalar', 'Ноты'), <Flower2 size={18} />)}
          {link('/admin/accords', tr('Akkordlar', 'Аккорды'), <Palette size={18} />)}
          {link('/admin/flakons', tr('Flakonlar (tara)', 'Флаконы (тара)'), <FlaskConical size={18} />)}
        </SidebarSection>
        <SidebarSection title={tr('Ombor', 'Склад')}>
          {link('/admin/stock', tr('Qoldiqlar', 'Остатки'), <Warehouse size={18} />, { badge: counts.lowStock, badgeTone: 'alert' })}
          {link('/admin/purchases', tr('Prixod', 'Приход'), <PackagePlus size={18} />)}
          {link('/admin/inventory', tr('Inventarizatsiya', 'Инвентаризация'), <ClipboardCheck size={18} />)}
          {link('/admin/writeoffs', tr('Spisanie', 'Списание'), <PackageMinus size={18} />)}
        </SidebarSection>
        <SidebarSection title={tr('Moliya', 'Финансы')}>
          {link('/admin/suppliers', tr('Yetkazib beruvchilar', 'Поставщики'), <Truck size={18} />)}
          {link('/admin/expenses', tr('Chiqimlar', 'Расходы'), <Wallet size={18} />)}
        </SidebarSection>
        <SidebarSection title={tr('Mijoz ilovasi', 'Приложение клиента')}>
          {link('/admin/banners', tr('Bannerlar', 'Баннеры'), <GalleryHorizontal size={18} />)}
          {link('/admin/reviews', tr('Sharhlar', 'Отзывы'), <MessageSquare size={18} />)}
        </SidebarSection>
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-neutral-200 p-3">
        {link('/admin/users', tr('Xodimlar', 'Сотрудники'), <UserCog size={18} />)}
        {link('/admin/settings', tr('Sozlamalar', 'Настройки'), <Settings size={18} />)}
      </div>
    </aside>
  )
}
