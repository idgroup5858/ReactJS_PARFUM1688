import { useEffect } from 'react'
import { APP_NAME } from '@/app/appInfo'

/** Brauzer tabidagi sarlavha: "Mavzu · Til Darslari". */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
