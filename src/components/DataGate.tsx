import { RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { errorText } from '@/api/errors'
import { emitServerChange, useRealtime, type SocketAuth } from '@/api/realtime'
import { logout, sessionToken } from '@/app/session'
import EmptyState from '@/components/ui/EmptyState'
import { clearCustomerSession, useCustomer } from '@/customer/store'
import { openDb, refreshDb, useDbState, type DbMode } from '@/data/db'
import AppLoading from '@/pages/errors/AppLoading'
import { useErrorTexts } from '@/pages/errors/errorTexts'
import { useStaffLang } from '@/staff/i18n'

/**
 * Bo'lim ma'lumoti (data/db.ts) yuklanguncha — brend, xato bo'lsa — qayta urinish tugmasi. Yuklangandan keyin socket
 * ulanadi: boshqa ekrandagi o'zgarish (`changed`, `order`, `catalog`) yoki qayta ulanish — baza qaytadan olinadi.
 *   staff — xodim tokeni bilan (kassa, admin), shop — mijoz qurilmasi tokeni bilan (yoki mehmon).
 */
export default function DataGate({ mode, children }: { mode: DbMode; children: ReactNode }) {
  const state = useDbState()
  const { token: customerToken, lang } = useCustomer()
  const staffLang = useStaffLang()
  const { pathname } = useLocation()
  const text = useErrorTexts(pathname)

  useEffect(() => {
    void openDb(mode)
  }, [mode])

  // mijoz tokeni o'zgardi (birinchi buyurtma, Telegram sessiyasi) — "Мои заказы" yangi token bilan
  const previousToken = useRef(customerToken)
  useEffect(() => {
    if (mode !== 'shop' || previousToken.current === customerToken) return
    previousToken.current = customerToken
    void refreshDb()
  }, [mode, customerToken])

  const staffToken = mode === 'staff' ? sessionToken() : null
  const auth: SocketAuth | null = mode === 'staff' ? (staffToken ? { token: staffToken } : null) : customerToken ? { customerToken } : {}
  useRealtime(state.ready ? auth : null, {
    onReady: () => void refreshDb(),
    onOrder: () => void refreshDb(),
    onChanged: (scopes) => {
      emitServerChange(scopes)
      // Telegram ma'lumoti bazada (snapshot) yo'q — rassilka jarayoni har 2 soniyada butun bazani qayta olmasin
      if (!scopes.every((scope) => scope === 'telegram')) void refreshDb()
    },
    onCatalog: () => void refreshDb(),
    // xodim bloklangan / token eskirgan; mijoz tokeni yaroqsiz — keyingi buyurtmada yangisi beriladi
    onAuthError: () => (mode === 'staff' ? logout() : clearCustomerSession()),
  })

  if (state.mode === mode && state.ready) return children
  if (state.mode === mode && state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-4">
        <div className="w-full max-w-lg">
          <EmptyState
            icon={WifiOff}
            title={text.error}
            message={errorText(state.error, mode === 'staff' ? staffLang : lang)}
            action={
              <button
                type="button"
                onClick={() => void refreshDb()}
                className="btn-primary flex h-9 items-center gap-2 rounded px-5 text-xs font-semibold tracking-[0.12em] uppercase"
              >
                <RotateCcw size={14} />
                {text.reload}
              </button>
            }
          />
        </div>
      </div>
    )
  }
  return <AppLoading />
}
