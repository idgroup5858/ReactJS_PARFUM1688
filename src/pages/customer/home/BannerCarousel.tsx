import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import Img from '@/components/ui/Img'
import { useLoc } from '@/customer/i18n'
import { useDb } from '@/data/db'

const INTERVAL = 5000

/**
 * Bosh sahifa banneri (admin → Bannerlar): to'q aksent fonda serif sarlavha, matn, tugma va o'ngda flakon rasmi.
 * 5 soniyada o'zi almashadi, barmoq bilan suriladi, pastda nuqtalar.
 */
export default function BannerCarousel() {
  const db = useDb()
  const loc = useLoc()
  const navigate = useNavigate()
  const banners = useMemo(() => db.banners.filter((banner) => banner.active).sort((a, b) => a.sort - b.sort), [db.banners])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = banners.length
  const current = count > 0 ? index % count : 0

  useEffect(() => {
    if (paused || count < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL)
    return () => window.clearInterval(timer)
  }, [paused, count])

  if (count === 0) return null

  const go = (next: number) => setIndex(((next % count) + count) % count)

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX
        setPaused(true)
      }}
      onTouchEnd={(event) => {
        const start = touchX.current
        touchX.current = null
        setPaused(false)
        if (start === null) return
        const dx = event.changedTouches[0].clientX - start
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1))
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
        {banners.map((banner, position) => (
          <div key={banner.id} className="bg-hero relative h-[214px] w-full shrink-0 overflow-hidden" aria-hidden={position !== current}>
            <Img
              path={banner.image}
              alt=""
              fit="contain"
              className="pointer-events-none absolute right-1 bottom-0 h-[88%] w-[44%] bg-transparent! object-bottom"
            />
            <div className="relative flex h-full max-w-[64%] flex-col justify-center px-5 py-5">
              <h2 className="font-serif text-[27px] leading-[1.05] font-semibold tracking-[0.02em] uppercase">{loc(banner.title)}</h2>
              <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-white/85">{loc(banner.subtitle)}</p>
              <button
                type="button"
                tabIndex={position === current ? 0 : -1}
                onClick={() => navigate(banner.link)}
                className="mt-4 flex h-10 w-fit cursor-pointer items-center gap-2 rounded border border-white/15 bg-brand-fill px-4 text-[13px] font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-brand-fill-hover"
              >
                {loc(banner.button)}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {banners.map((banner, position) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`${position + 1} / ${count}`}
              onClick={() => go(position)}
              className={`h-2 cursor-pointer rounded-full transition-all ${position === current ? 'w-5 bg-light' :'w-2 border border-white/70 bg-transparent'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
