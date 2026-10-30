/**
 * localStorage bilan xavfsiz ishlash: brauzer saqlashni bloklasa (maxfiy rejim va h.k.) ilova baribir ishlaydi,
 * faqat o'zgarishlar sahifa yangilanguncha amal qiladi.
 */

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // saqlash bloklangan yoki joy tugagan — holat xotirada qoladi
  }
}

/** Boshqa tabda shu kalit o'zgarsa [listener] chaqiriladi. */
export function onStorageChange(key: string, listener: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
