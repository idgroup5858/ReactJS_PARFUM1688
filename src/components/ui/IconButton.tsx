import type { ReactNode } from 'react'

type Props = {
  label: string
  onClick: () => void
  children: ReactNode
  /** masalan sevimlilarga qo'shilgan misol yulduzchasi */
  active?: boolean
  tone?: 'default' | 'danger'
}

/**
 * Kartochka ichidagi ixcham (32px) ikonka tugmasi — `btn-icon`. Bir qatorda bir nechtasi turganda ham sarlavhaga
 * joy qoladi.
 */
export default function IconButton({ label, onClick, children, active = false, tone = 'default' }: Props) {
  const toneClass = tone === 'danger' ? 'btn-icon-danger' : 'btn-icon'
  const activeClass = active ? 'border-brand-200! bg-brand-50! text-brand-700!' : ''
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={tone === 'default' ? active : undefined}
      className={`${toneClass} ${activeClass} flex h-8 w-8 shrink-0 items-center justify-center rounded`}
    >
      {children}
    </button>
  )
}
