import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { errorText } from '@/api/errors'
import { APP_NAME } from '@/app/appInfo'
import { useDemoInfo } from '@/app/demo'
import { login, nextPathFor, useCurrentUser } from '@/app/session'
import StaffLangSwitch from '@/components/staff/StaffLangSwitch'
import PinPad from '@/components/ui/PinPad'
import { ROLE_LABEL } from '@/domain/labels'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tr, useStaffLang } from '@/staff/i18n'

/**
 * Xodimlar kirishi: PIN kod. Admin — /admin ga, kassir — /kassa ga (yoki `?next=` dagi ruxsat etilgan ichki manzilga;
 * tashqi yoki noto'g'ri manzil e'tiborga olinmaydi — sessiya saqlangani uchun aks holda tab xato sahifasida qolib ketardi).
 */
export default function LoginPage() {
  // layout'dan tashqarida — til almashganda o'zi qayta chizilsin
  useStaffLang()
  useDocumentTitle(tr('Kirish', 'Вход'))
  const user = useCurrentUser()
  // demo rejimda (backend `DEMO=1`) — seed xodimlarining hali o'zgarmagan PIN'lari
  const demoPins = useDemoInfo().pins
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = params.get('next')

  if (user) return <Navigate to={nextPathFor(user.role, next)} replace />

  const submit = async (pin: string) => {
    try {
      const found = await login(pin)
      navigate(nextPathFor(found.role, next), { replace: true })
      return null
    } catch (error) {
      return errorText(error)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-page p-4">
      <div className="absolute top-4 right-4">
        <StaffLangSwitch />
      </div>
      <div className="w-full max-w-sm">
        <div className="rounded border border-neutral-200 bg-white">
          <div className="bg-hero flex flex-col items-center gap-1 rounded-t px-6 py-7 text-center">
            <span className="font-brand text-[26px] font-semibold tracking-[0.08em]">✦ {APP_NAME}</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-white/70 uppercase">{tr('Kassa · Admin', 'Касса · Админ')}</span>
          </div>
          <div className="p-5">
            <PinPad onSubmit={submit} />
          </div>
        </div>
        {demoPins.length > 0 && (
          <div className="mt-3 rounded border border-dashed border-neutral-300 bg-white px-4 py-3 text-xs text-neutral-500">
            <p className="mb-1 font-semibold text-neutral-700">{tr('Demo PIN kodlar', 'Демо PIN-коды')}</p>
            {demoPins.map((item) => (
              <p key={item.pin} className="flex justify-between gap-3">
                <span className="truncate">
                  {item.name} · {ROLE_LABEL[item.role]}
                </span>
                <span className="font-mono font-semibold text-neutral-800">{item.pin}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
