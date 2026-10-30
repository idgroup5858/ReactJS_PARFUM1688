import { useEffect } from 'react'
import { createStore, useStore } from '@/store/createStore'

/**
 * Yuqori panel holati: ichki sahifa (katalog, atir, buyurtma...) o'z nomini qo'yadi — panelda "‹ Назад · Каталог"
 * ko'rinadi; asosiy tablarda nom yo'q — brend ko'rinadi.
 */
const titleStore = createStore<string | null>(null)

export function usePageTitle(title: string | null): void {
  useEffect(() => {
    titleStore.set(title)
    return () => titleStore.set(null)
  }, [title])
}

export function usePageTitleValue(): string | null {
  return useStore(titleStore)
}
