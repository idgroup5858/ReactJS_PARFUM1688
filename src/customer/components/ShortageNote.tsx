import { TriangleAlert } from 'lucide-react'
import { useDb } from '@/data/db'
import { parseStockKey } from '@/domain/stock'
import type { StockKey } from '@/domain/types'
import { formatNumber } from '@/lib/format'
import { useT } from '../i18n'

/** Omborda yetmaydigan savat qatorlari haqida ogohlantirish. */
export default function ShortageNote({ missing }: { missing: { key: StockKey; need: number; have: number }[] }) {
  const t = useT()
  const db = useDb()
  if (missing.length === 0) return null
  return (
    <div className="flex gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{t.checkout.shortage}</p>
        <ul className="mt-1 space-y-0.5">
          {missing.map((item) => {
            const { kind, id } = parseStockKey(item.key)
            const name = db.products.find((product) => product.id === id)?.name ?? id
            const unit = kind === 'gram' ? t.common.g : t.common.pcs
            return (
              <li key={item.key}>
                {name} — {t.checkout.available(`${formatNumber(Math.max(0, item.have))} ${unit}`)}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
