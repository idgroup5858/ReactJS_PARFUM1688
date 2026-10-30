import { Leaf, MoonStar, Radio, Snowflake, Sprout, Sun, Timer, Umbrella, VenusAndMars, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Img from '@/components/ui/Img'
import { useLoc, useT } from '@/customer/i18n'
import { useDb } from '@/data/db'
import {
  GENDER_COLORS,
  SEASON_COLORS,
  accordWidth,
  genderBars,
  longevityBars,
  readableTextColor,
  seasonBars,
  sillageBars,
  type Bar,
  type SeasonKey,
} from '@/domain/presets'
import type { Product } from '@/domain/types'
import { formatNumber } from '@/lib/format'

/** Atir sahifasining ma'lumot bloklari: notalar piramidasi, akkordlar, mavsum, turg'unlik, shleyf, jins. */

function Block({ title, icon: Icon, children, className = '' }: { title: string; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded border border-neutral-200 bg-white p-4 ${className}`}>
      <h3 className="mb-4 flex flex-col items-center gap-2 text-center text-[13px] font-bold tracking-[0.12em] text-neutral-900 uppercase">
        {Icon && <Icon size={20} className="text-neutral-400" strokeWidth={1.75} />}
        {title}
      </h3>
      {children}
    </section>
  )
}

export function NotesPyramid({ product }: { product: Product }) {
  const t = useT()
  const loc = useLoc()
  const db = useDb()
  const levels = [
    { id: 'top', title: t.product.top, ids: product.notes.top },
    { id: 'middle', title: t.product.middle, ids: product.notes.middle },
    { id: 'base', title: t.product.base, ids: product.notes.base },
  ].filter((level) => level.ids.length > 0)
  if (levels.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-[13px] font-bold tracking-[0.12em] text-neutral-900 uppercase">{t.product.notes}</h2>
      <div className="space-y-2.5">
        {levels.map((level, index) => (
          // piramida: har pastki daraja biroz kengroq
          <div key={level.id} className="mx-auto rounded bg-brand-50 px-3 py-3" style={{ width: `${82 + index * 9}%` }}>
            <p className="mb-2.5 text-center text-[11px] font-bold tracking-[0.14em] text-brand-700 uppercase">{level.title}</p>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2.5">
              {level.ids.map((noteId) => {
                const note = db.notes.find((item) => item.id === noteId)
                if (!note) return null
                return (
                  <div key={noteId} className="flex w-[68px] flex-col items-center gap-1 text-center">
                    <Img path={note.image} alt={loc(note.name)} className="h-14 w-14 rounded-sm bg-white" fit="cover" />
                    <span className="text-[12px] leading-tight text-neutral-700">{loc(note.name)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AccordsBlock({ product }: { product: Product }) {
  const t = useT()
  const loc = useLoc()
  const db = useDb()
  const accords = product.accords.map((id) => db.accords.find((accord) => accord.id === id)).filter((accord) => accord !== undefined)
  if (accords.length === 0) return null
  return (
    <Block title={t.product.accords}>
      <div className="mx-auto max-w-[320px] space-y-1.5">
        {accords.map((accord, index) => (
          <div
            key={accord.id}
            className="flex h-7 items-center justify-center rounded-sm px-2 text-[13px] font-medium whitespace-nowrap"
            style={{ width: `${accordWidth(index)}%`, backgroundColor: accord.color, color: readableTextColor(accord.color) }}
          >
            {loc(accord.name)}
          </div>
        ))}
      </div>
    </Block>
  )
}

const SEASON_ICONS: Record<SeasonKey, LucideIcon> = {
  winter: Snowflake,
  spring: Sprout,
  summer: Umbrella,
  autumn: Leaf,
  day: Sun,
  night: MoonStar,
}

export function SeasonBlock({ product }: { product: Product }) {
  const t = useT()
  const loc = useLoc()
  return (
    <section className="rounded border border-neutral-200 bg-white p-4">
      <h3 className="mb-4 flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] text-neutral-900 uppercase">
        <Timer size={17} className="text-neutral-400" />
        {t.product.whenToWear}
      </h3>
      {/* tor ekranda 6 ustunga "Kechqurun" sig'maydi: 4 fasl bir qatorda, kunduz / kechqurun ostida o'rtada */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 min-[460px]:grid-cols-6">
        {seasonBars(product.season).map((bar) => {
          const key = bar.id as SeasonKey
          const Icon = SEASON_ICONS[key]
          const color = SEASON_COLORS[key]
          return (
            <div key={bar.id} className={`flex min-w-0 flex-col items-center gap-1.5 text-center ${key === 'day' ? 'col-start-2 min-[460px]:col-start-auto' : ''}`}>
              <Icon size={24} strokeWidth={1.5} className="text-neutral-400" />
              <span className="w-full text-[11px] leading-tight break-words text-neutral-700">{loc(bar.label)}</span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <span className="block h-full rounded-full" style={{ width: `${bar.value}%`, backgroundColor: color }} />
              </span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color }}>
                {bar.value}%
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function LevelRows({ bars, color, strong }: { bars: Bar[]; color: string; strong: string }) {
  const loc = useLoc()
  const top = Math.max(...bars.map((bar) => bar.value))
  return (
    <div className="space-y-2.5">
      {bars.map((bar) => (
        <div key={bar.id} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,0.9fr)] items-center gap-2">
          <span className="text-[12px] leading-tight text-neutral-700">{loc(bar.label)}</span>
          <span className="text-right text-[12px] text-neutral-500 tabular-nums">{bar.value}%</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <span className="block h-full rounded-full" style={{ width: `${bar.value}%`, backgroundColor: bar.value === top ? strong : color }} />
          </span>
        </div>
      ))}
    </div>
  )
}

export function LongevitySillage({ product }: { product: Product }) {
  const t = useT()
  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
      <Block title={t.product.longevity} icon={Timer}>
        <LevelRows bars={longevityBars(product.longevity)} color="#2bb5c8" strong="#1b7d8a" />
      </Block>
      <Block title={t.product.sillage} icon={Radio}>
        <LevelRows bars={sillageBars(product.sillage)} color="#43c06a" strong="#2b8a47" />
      </Block>
    </div>
  )
}

export function GenderBlock({ product }: { product: Product }) {
  const t = useT()
  const loc = useLoc()
  return (
    <Block title={t.product.gender} icon={VenusAndMars}>
      <div className="space-y-2.5">
        {genderBars(product.gender).map((bar) => (
          <div key={bar.id} className="grid grid-cols-[5.5rem_3rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-[13px] text-neutral-700">{loc(bar.label)}</span>
            <span className="text-[12px] text-neutral-500 tabular-nums">{formatNumber(bar.value, 1)}%</span>
            <span className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${bar.value}%`, backgroundColor: GENDER_COLORS[bar.id as keyof typeof GENDER_COLORS] }}
              />
            </span>
          </div>
        ))}
      </div>
    </Block>
  )
}
