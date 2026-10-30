import { APP_NAME } from '@/app/appInfo'

/** Sahifa bo'lagi yuklanguncha (birinchi ochilishda) — markazda brend. */
export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <span className="animate-pulse font-brand text-2xl font-semibold tracking-[0.1em] text-brand-700">✦ {APP_NAME}</span>
    </div>
  )
}
