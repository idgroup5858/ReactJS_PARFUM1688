import { ExternalLink, Smartphone } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/styles'
import { tr } from '@/staff/i18n'
import { findAccent } from '@/theme/accents'
import AccentPalette from './AccentPalette'

type Props = {
  accentId: string
  onChange: (accentId: string) => void
}

/**
 * Mijoz ilovasi (Telegram Mini App) rangi — barcha mijozlar uchun bitta, serverda saqlanadi. O'ngda haqiqiy mijoz
 * ilovasi iframe'da ochiq turadi: rang bosilishi bilan u ham almashadi (server socket orqali `catalog` xabarini
 * yuboradi), ichida bemalol yurib ko'rish mumkin.
 */
export default function CustomerAppearanceCard({ accentId, onChange }: Props) {
  const accent = findAccent(accentId)
  return (
    <Card>
      <CardHeader
        title={tr('Mijoz ilovasi rangi', 'Цвет приложения клиента')}
        hint={tr(
          'Telegram Mini App: tugmalar, bannerlar, belgilar — barcha mijozlar uchun',
          'Telegram Mini App: кнопки, баннеры, значки — для всех клиентов',
        )}
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
            <span className="h-3 w-3 rounded-full ring-1 ring-black/10 ring-inset" style={{ backgroundColor: accent.color }} />
            {tr(accent.name, accent.nameRu)}
          </span>
        }
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <AccentPalette value={accentId} onChange={onChange} label={tr('Mijoz ilovasi rangi', 'Цвет приложения клиента')} />
          <ul className="list-disc space-y-1 px-4 pl-8 text-xs text-neutral-600">
            <li>{tr('Tanlangan rang darhol barcha mijozlarning ilovasida almashadi.', 'Выбранный цвет сразу меняется в приложении у всех клиентов.')}</li>
            <li>
              {tr(
                "Kunduzgi / tungi rejim Telegram mavzusiga moslashadi, mijoz uni ilovadagi oy tugmasi bilan o'zi almashtira oladi.",
                'Светлая / тёмная тема подстраивается под Telegram, клиент может сам переключить её кнопкой луны в приложении.',
              )}
            </li>
            <li>
              {tr(
                "Kassa va admin rangi pastda alohida — u mijozlarga ta'sir qilmaydi.",
                'Цвет кассы и админки задаётся ниже отдельно — на клиентов он не влияет.',
              )}
            </li>
          </ul>
          <div className="p-4">
            <a href="/" target="_blank" rel="noreferrer" className={`btn-outline ${buttonClass} h-9`}>
              <ExternalLink size={15} />
              {tr('Mijoz ilovasini ochish', 'Открыть приложение клиента')}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 border-t border-neutral-200 bg-neutral-50 p-4 lg:border-t-0 lg:border-l">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Smartphone size={14} />
            {tr("Mijoz ko'radigan ko'rinish", 'Как видит клиент')}
          </p>
          <iframe
            src="/"
            title={tr("Mijoz ilovasi ko'rinishi", 'Предпросмотр приложения клиента')}
            className="h-[640px] w-[360px] max-w-full rounded border border-neutral-300 bg-white"
          />
        </div>
      </div>
    </Card>
  )
}
