import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/** Hozir amalda qorong'i mavzu ishlayaptimi (<html class="dark"> — xodim sozlamasi yoki Telegram mavzusi). */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'))
}
