import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  id?: string
}

/** Kartochka (ReactJS_Recipe / hr-ui): oq yuza, ingichka chegara, 3px burchak. */
export function Card({ children, className = '', id }: CardProps) {
  return (
    <section id={id} className={`rounded border border-neutral-200 bg-white ${className}`}>
      {children}
    </section>
  )
}

type CardHeaderProps = {
  title: ReactNode
  hint?: ReactNode
  actions?: ReactNode
}

/** Kartochka sarlavhasi: harflari ochiq yozilgan nom, ostida izoh, o'ngda qo'shimcha element — pastida chiziq. */
export function CardHeader({ title, hint, actions }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
