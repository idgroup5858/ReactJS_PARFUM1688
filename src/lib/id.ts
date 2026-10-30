/** Vaqtinchalik id (kassa chekidagi qator): qisqa, vaqt bo'yicha tartiblanadigan ("m3k9x2-a7f3"). Yozuv id lari — serverda. */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
