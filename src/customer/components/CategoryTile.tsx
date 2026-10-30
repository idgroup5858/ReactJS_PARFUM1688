import { Link } from 'react-router'
import Img from '@/components/ui/Img'
import type { Category } from '@/domain/types'
import { useLoc } from '../i18n'

/**
 * Kategoriya kartasi: tepada rasm, pastda nom. Nom hech qachon "Цве..." bo'lib kesilmaydi — kerak bo'lsa ikki
 * qatorga o'tadi (namunadagi kompyuter ko'rinishidagi xato takrorlanmasin).
 */
export default function CategoryTile({ category }: { category: Category }) {
  const loc = useLoc()
  const name = loc(category.name)
  return (
    <Link
      to={`/catalog?category=${category.id}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded border border-neutral-200 bg-white transition-colors hover:border-brand-200"
    >
      <Img path={category.image} alt={name} className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
      <span className="flex min-h-11 items-center px-2.5 py-2 text-[13px] leading-tight break-words text-neutral-800">{name}</span>
    </Link>
  )
}
