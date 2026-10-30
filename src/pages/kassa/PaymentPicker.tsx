import { Banknote, CreditCard, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { PAYMENT_LABEL, PAYMENT_TYPES } from '@/domain/labels'
import type { PaymentType } from '@/domain/types'
import { tr } from '@/staff/i18n'

const ICONS: Record<PaymentType, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  click: Smartphone,
  payme: Wallet,
}

type Props = {
  value: PaymentType | undefined
  onChange: (value: PaymentType) => void
  /** lg — POS dagi katta sensorli tugmalar */
  size?: 'md' | 'lg'
}

/** To'lov turi: Naqd / Karta / Click / Payme (faqat turini belgilash — integratsiyasiz). */
export default function PaymentPicker({ value, onChange, size = 'md' }: Props) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={tr("To'lov turi", 'Способ оплаты')}>
      {PAYMENT_TYPES.map((type) => {
        const Icon = ICONS[type]
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(type)}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded border text-xs font-semibold transition-colors ${size === 'lg' ? 'h-16' : 'h-14'} ${active ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'}`}
          >
            <Icon size={size === 'lg' ? 20 : 18} />
            {PAYMENT_LABEL[type]}
          </button>
        )
      })}
    </div>
  )
}
