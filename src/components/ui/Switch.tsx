type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** Yoqish/o'chirish tugmasi; yoqilganda aksent rangda. */
export default function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? 'bg-brand-700' : 'bg-neutral-300'}`}
    >
      <span
        className={`bg-light h-4 w-4 rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
