import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** Sahifa boshidagi sarlavha: kichik, harflari ochiq yozilgan aksent sarlavha + izoh. */
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand-800">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
