import { Check, Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { tr } from '@/staff/i18n'
import { setThemeMode, useSettings, type ThemeMode } from '@/store/settingsStore'

const themes = (): { id: ThemeMode; name: string; hint: string; icon: ReactNode }[] => [
  { id: 'system', name: tr('Tizim', 'Системная'), hint: tr('Qurilma sozlamasiga moslashadi', 'Как в настройках устройства'), icon: <Monitor size={16} /> },
  { id: 'light', name: tr('Kunduzgi', 'Светлая'), hint: tr("Och fon, to'q matn", 'Светлый фон, тёмный текст'), icon: <Sun size={16} /> },
  { id: 'dark', name: tr('Tungi', 'Тёмная'), hint: tr("Ko'zni kamroq charchatadi", 'Меньше утомляет глаза'), icon: <Moon size={16} /> },
]

/** Mavzu (tema): Tizim / Kunduzgi / Tungi — shu qurilmadagi kassa va admin uchun. */
export default function ThemeCard() {
  const { themeMode } = useSettings()
  return (
    <Card>
      <CardHeader
        title={tr('Kassa va admin mavzusi', 'Тема кассы и админки')}
        hint={tr(
          'Faqat shu qurilmada · tepadagi oy / quyosh tugmasi bilan ham almashtiriladi',
          'Только на этом устройстве · также переключается кнопкой луны / солнца вверху',
        )}
      />
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 xl:grid-cols-1" role="radiogroup" aria-label={tr('Kassa va admin mavzusi', 'Тема кассы и админки')}>
        {themes().map((theme) => {
          const active = themeMode === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setThemeMode(theme.id)}
              className={`flex cursor-pointer items-center gap-3 rounded border px-3.5 py-2.5 text-left transition-colors ${active ? 'border-brand-700 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? 'bg-brand-700 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                {theme.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${active ? 'text-brand-700' : 'text-neutral-900'}`}>{theme.name}</span>
                <span className="block truncate text-xs text-neutral-500">{theme.hint}</span>
              </span>
              {active && <Check size={16} className="shrink-0 text-brand-700" />}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
