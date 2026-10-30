import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

const baseClass = 'flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded p-2 text-sm font-semibold transition-colors'
const idleClass = 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
const activeClass = 'bg-brand-50 text-brand-700'

type ButtonProps = {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}

/** Header'dagi chegarasiz ikonka tugmasi. */
export function HeaderButton({ label, onClick, children, className = '' }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`${baseClass} ${idleClass} ${className}`}>
      {children}
    </button>
  )
}

type LinkProps = {
  to: string
  label: string
  children: ReactNode
  className?: string
  end?: boolean
}

/** Sahifaga o'tuvchi header tugmasi; shu sahifa ochiq bo'lsa aksent rangda turadi. */
export function HeaderLink({ to, label, children, className = '', end = false }: LinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      title={label}
      className={({ isActive }) => `${baseClass} ${isActive ? activeClass : idleClass} ${className}`}
    >
      {children}
    </NavLink>
  )
}
