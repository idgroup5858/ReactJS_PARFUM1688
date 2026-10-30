import { RotateCcw, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useLocation, useRouteError } from 'react-router'
import EmptyState from '@/components/ui/EmptyState'
import { useErrorTexts } from './errorTexts'

function describe(error: unknown): string | null {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return null
}

/** Kutilmagan xatolik — butun sahifa o'rnida, qayta yuklash tugmasi bilan. Mijoz ilovasida — mijoz tilida. */
export default function RootError() {
  const error = useRouteError()
  const { pathname } = useLocation()
  const text = useErrorTexts(pathname)
  console.error(error)
  const details = describe(error)
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-lg">
        <EmptyState
          icon={TriangleAlert}
          title={text.error}
          message={
            <>
              {text.errorHint}
              <span className="mt-1 block text-xs break-words text-neutral-400">{details ?? text.unknownError}</span>
            </>
          }
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
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
