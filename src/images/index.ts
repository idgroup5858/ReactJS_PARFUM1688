import { SERVER_URL } from '@/api/http'
import type { ImagePath } from '@/domain/types'

/**
 * Rasmlar faqat backendda: `IMAGES_DIR/<papka>/<fayl>` (standart — `NestJS_PARFUM1688/uploads`), `/images/...` da
 * beriladi; admin yuklagan rasm ham o'sha yerga yoziladi (`POST /api/images`). Ilovaga rasm qo'shilmaydi.
 *
 * Ma'lumotlarda rasm papka ichidagi yo'l bilan saqlanadi: "perfumes/dior-sauvage.png". Kengaytmasi boshqacha fayl
 * (masalan .jpg yoki .webp) ham topiladi — nomi bir xil bo'lsa yetarli (server qidiradi).
 */

export const IMAGE_FOLDERS = [
  { id: 'perfumes', name: 'Atirlar' },
  { id: 'notes', name: 'Notalar' },
  { id: 'categories', name: 'Kategoriyalar' },
  { id: 'banners', name: 'Bannerlar' },
  { id: 'flakons', name: 'Flakonlar' },
] as const

export type ImageFolder = (typeof IMAGE_FOLDERS)[number]['id']

/**
 * Rasm manzili serverda. Yo'l bo'sh bo'lsa `undefined`; server topmasa `<img>` xato beradi va komponent o'rniga belgi
 * chizadi (components/ui/Img).
 */
export function imageUrl(path: ImagePath | undefined): string | undefined {
  if (!path) return undefined
  return `${SERVER_URL}/images/${path}`
}

export type ImageFile = { path: ImagePath; url: string; name: string }
