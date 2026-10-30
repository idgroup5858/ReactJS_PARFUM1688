import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { imageUrl } from '@/images'

type Props = {
  path: string | undefined
  alt: string
  className?: string
  /** contain — butun rasm ko'rinadi (atir flakoni), cover — joyni to'ldiradi (kategoriya, banner) */
  fit?: 'contain' | 'cover'
}

/** Papkadagi rasm (images/index.ts). Fayl topilmasa — kulrang fonda belgi, sahifa "sinmaydi". */
export default function Img({ path, alt, className = '', fit = 'cover' }: Props) {
  const url = imageUrl(path)
  const [failedUrl, setFailedUrl] = useState<string>()
  if (!url || failedUrl === url) {
    // chaqiruvchi o'z fonini bergan bo'lsa (masalan bg-photo) — o'sha qoladi
    const background = /(^|\s)bg-/.test(className) ? '' : 'bg-neutral-100'
    return (
      <span role="img" aria-label={alt} className={`flex items-center justify-center text-neutral-300 ${background} ${className}`}>
        <ImageOff size={20} />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailedUrl(url)}
      className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
    />
  )
}
