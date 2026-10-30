import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  GENDER_COLORS,
  genderBars,
  LONGEVITY_LABELS,
  LONGEVITY_LEVELS,
  longevityBars,
  SEASON_COLORS,
  SEASON_PRESETS,
  seasonBars,
  SILLAGE_LABELS,
  SILLAGE_LEVELS,
  sillageBars,
  type Bar,
  type SeasonKey,
} from '@/domain/presets'
import type { Gender, LongevityLevel, SeasonPreset, SillageLevel } from '@/domain/types'
import { loc, tr } from '@/staff/i18n'
import { BarsPreview, MiniBars } from './PresetBars'

const SEASON_IDS = Object.keys(SEASON_PRESETS) as SeasonPreset[]
const seasonColor = (bar: Bar) => SEASON_COLORS[bar.id as SeasonKey]
const LONGEVITY_COLOR = '#1f9bb5'
const SILLAGE_COLOR = '#3fae5a'

type OptionProps = {
  active: boolean
  label: string
  bars: ReactNode
  onClick: () => void
}

/**
 * Radio-karta: yuqorida belgi va kichik ustunlar, ostida yorliq. Yorliq ustunlar yonida emas, ostida — tor
 * ustunlarda (sidebar ochiq, 1024–1280px) ham kartaning butun kengligini oladi va ustunlar ostida qolib ketmaydi.
 */
function OptionCard({ active, label, bars, onClick }: OptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-w-0 cursor-pointer flex-col gap-1.5 rounded border px-3 py-2.5 text-left transition-colors ${active ? 'border-brand-700 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}`}
    >
      <span className="flex items-end justify-between gap-2">
        {active ? <Check size={14} className="shrink-0 text-brand-700" /> : <span className="block h-3.5 w-3.5 shrink-0 rounded-full border border-neutral-300" />}
        {bars}
      </span>
      <span className={`block text-xs leading-snug ${active ? 'font-semibold text-brand-700' : 'text-neutral-700'}`}>{label}</span>
    </button>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-neutral-200 p-4 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
      {children}
    </div>
  )
}

type Props = {
  season: SeasonPreset
  longevity: LongevityLevel
  sillage: SillageLevel
  gender: Gender
  onChange: (patch: { season?: SeasonPreset; longevity?: LongevityLevel; sillage?: SillageLevel }) => void
}

/**
 * "Когда носить", "Стойкость", "Шлейф": admin har bo'limdan bitta asosiy qiymatni tanlaydi, mijoz sahifasidagi
 * foiz chiziqlari tayyor jadvallardan (domain/presets.ts) olinadi. Jins chiziqlari "Jinsi" maydoniga bog'liq.
 */
export default function TraitsCard({ season, longevity, sillage, gender, onChange }: Props) {
  return (
    <Card>
      <CardHeader
        title={tr('Xususiyatlar', 'Характеристики')}
        hint={tr('Bitta asosiy qiymatni tanlang — mijoz ilovasidagi chiziqlar avtomatik chiziladi', 'Выберите одно основное значение — шкалы в приложении клиента построятся автоматически')}
      />

      <Section title={tr('Qachon taqiladi', 'Когда носить')} hint={tr('Fasl va kun vaqti (Когда носить)', 'Сезон и время суток')}>
        <div role="radiogroup" aria-label={tr('Qachon taqiladi', 'Когда носить')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SEASON_IDS.map((id) => (
            <OptionCard
              key={id}
              active={season === id}
              label={loc(SEASON_PRESETS[id].label)}
              bars={<MiniBars bars={seasonBars(id)} colors={seasonColor} />}
              onClick={() => onChange({ season: id })}
            />
          ))}
        </div>
        <BarsPreview bars={seasonBars(season)} colors={seasonColor} />
      </Section>

      <Section title={tr("Turg'unlik", 'Стойкость')} hint={tr('Teridagi chidamlilik (Стойкость)', 'Сколько держится на коже')}>
        {/* 5 ta karta bir qatorga faqat keng ekranda sig'adi (o'ng ustun va sidebar bilan) */}
        <div role="radiogroup" aria-label={tr("Turg'unlik", 'Стойкость')} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {LONGEVITY_LEVELS.map((id) => (
            <OptionCard
              key={id}
              active={longevity === id}
              label={loc(LONGEVITY_LABELS[id])}
              bars={<MiniBars bars={longevityBars(id)} colors={LONGEVITY_COLOR} />}
              onClick={() => onChange({ longevity: id })}
            />
          ))}
        </div>
        <BarsPreview bars={longevityBars(longevity)} colors={LONGEVITY_COLOR} />
      </Section>

      <Section title={tr('Shleyf', 'Шлейф')} hint={tr('Atrofga taralishi (Шлейф)', 'Насколько аромат распространяется вокруг')}>
        <div role="radiogroup" aria-label={tr('Shleyf', 'Шлейф')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SILLAGE_LEVELS.map((id) => (
            <OptionCard
              key={id}
              active={sillage === id}
              label={loc(SILLAGE_LABELS[id])}
              bars={<MiniBars bars={sillageBars(id)} colors={SILLAGE_COLOR} />}
              onClick={() => onChange({ sillage: id })}
            />
          ))}
        </div>
        <BarsPreview bars={sillageBars(sillage)} colors={SILLAGE_COLOR} />
      </Section>

      <Section title={tr("Jins bo'yicha", 'По полу')} hint={tr("'Jinsi' maydonidan avtomatik (Пол)", 'Автоматически из поля «Пол»')}>
        <BarsPreview bars={genderBars(gender)} colors={(bar) => GENDER_COLORS[bar.id as Gender]} digits={1} />
      </Section>
    </Card>
  )
}
