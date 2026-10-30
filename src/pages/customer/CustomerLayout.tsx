import { ChevronLeft, Heart, House, LayoutGrid, Moon, ShoppingBag, Sun, User } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { APP_NAME } from '@/app/appInfo'
import DataGate from '@/components/DataGate'
import { resolveCart } from '@/customer/cart'
import { usePageTitleValue } from '@/customer/chrome'
import { useT } from '@/customer/i18n'
import { setLang, useCustomer } from '@/customer/store'
import { inTelegram, startTelegram, useTelegramBackButton } from '@/customer/telegram'
import { useDb } from '@/data/db'
import type { Lang } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { setCustomerAccent, setCustomerDark } from '@/theme/appearance'
import { useIsDark } from '@/theme/useIsDark'

/** Pastki menyudagi bo'limlar — qolgan sahifalar "ichki" (orqaga tugmasi bilan). */
const TAB_PATHS = ['/', '/categories', '/cart', '/favorites', '/profile']

/** Mijoz ilovasi: katalog serverdan yuklanguncha — brend (components/DataGate). */
export default function CustomerLayout() {
  return (
    <DataGate mode="shop">
      <CustomerShell />
    </DataGate>
  )
}

/**
 * Mijoz ilovasi qobig'i (Telegram Mini App): telefon kengligidagi ustun (kompyuterda markazda), yuqorida brend yoki
 * "‹ Назад · sahifa nomi" va RU/UZ, pastda 5 ta bo'lim. Telegram ichida — tayyor signali, to'liq ekran, mavzu va
 * Telegram'ning o'z "orqaga" tugmasi.
 */
function CustomerShell() {
  const t = useT()
  const db = useDb()
  const { lang, cart } = useCustomer()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = usePageTitleValue()
  const isTab = TAB_PATHS.includes(pathname)

  useEffect(() => startTelegram(), [])
  useEffect(() => setCustomerAccent(db.settings.customerAccentId), [db.settings.customerAccentId])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // to'g'ridan-to'g'ri havola bilan ochilgan bo'lsa, tarixda orqa sahifa yo'q — bosh sahifaga
  const goBack = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/', { replace: true }))
  useTelegramBackButton(!isTab, goBack)

  // savat sahifasidagidek: sotuvdan olingan / o'chirilgan atirlar sanalmaydi
  const cartCount = useMemo(() => resolveCart(db, cart).length, [db, cart])

  return (
    <div className="min-h-screen bg-[#e9e7e4] dark:bg-black">
      <div className="relative mx-auto flex min-h-screen max-w-[560px] flex-col bg-[#f7f5f2] text-neutral-900 dark:bg-page">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-4">
          {!isTab && title !== null ? (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {!inTelegram && (
                <button
                  type="button"
                  onClick={goBack}
                  className="-ml-2 flex shrink-0 cursor-pointer items-center gap-0.5 rounded px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <ChevronLeft size={18} />
                  {t.common.back}
                </button>
              )}
              <h1 className="min-w-0 truncate pl-1 text-[17px] font-bold text-neutral-900">{title}</h1>
            </div>
          ) : (
            <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-2 select-none">
              <span className="text-lg text-brand-700">✦</span>
              <span className="truncate font-brand text-xl leading-none font-semibold tracking-[0.06em] text-neutral-900">{APP_NAME}</span>
            </NavLink>
          )}
          <ThemeSwitch lightLabel={t.common.lightMode} darkLabel={t.common.darkMode} />
          <LangSwitch value={lang} label={t.common.language} />
        </header>

        <main className="flex-1 pb-[calc(76px+env(safe-area-inset-bottom))]">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[560px] grid-cols-5 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
          <Tab to="/" end label={t.tabs.home} icon={<House size={22} />} />
          <Tab to="/categories" label={t.tabs.categories} icon={<LayoutGrid size={22} />} />
          <Tab
            to="/cart"
            label={t.tabs.cart}
            icon={
              <span className="relative">
                <ShoppingBag size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-fill px-1 text-[10px] font-bold text-white tabular-nums">
                    {formatNumber(cartCount)}
                  </span>
                )}
              </span>
            }
          />
          <Tab to="/favorites" label={t.tabs.favorites} icon={<Heart size={22} />} />
          <Tab to="/profile" label={t.tabs.profile} icon={<User size={22} />} />
        </nav>
      </div>
      <ScrollRestoration />
    </div>
  )
}

function Tab({ to, label, icon, end = false }: { to: string; label: string; icon: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex h-[60px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[11px] transition-colors ${isActive ? 'font-semibold text-brand-700' : 'text-neutral-500 hover:text-neutral-800'}`
      }
    >
      {icon}
      {/* nom kesilmaydi ("Цве…" bo'lmasin): sig'masa ikki qatorga o'tadi */}
      <span className="w-full text-center leading-tight break-words">{label}</span>
    </NavLink>
  )
}

/** Kunduzgi / tungi rejim: tanlov qurilmada saqlanadi va Telegram / telefon mavzusidan ustun turadi. */
function ThemeSwitch({ lightLabel, darkLabel }: { lightLabel: string; darkLabel: string }) {
  const dark = useIsDark()
  const label = dark ? lightLabel : darkLabel
  return (
    <button
      type="button"
      onClick={() => setCustomerDark(!dark)}
      aria-label={label}
      title={label}
      className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded border border-neutral-200 text-neutral-500 transition-colors hover:text-neutral-900"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

function LangSwitch({ value, label }: { value: Lang; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 items-center rounded border border-neutral-200 p-0.5">
      {(['ru', 'uz'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="radio"
          aria-checked={value === lang}
          onClick={() => setLang(lang)}
          className={`h-7 cursor-pointer rounded-sm px-2 text-[11px] font-bold tracking-wider uppercase transition-colors ${value === lang ? 'bg-brand-fill text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
