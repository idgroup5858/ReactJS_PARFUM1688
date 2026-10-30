/**
 * Grafik belgilari rangi — asosiy rangdan hosil qilinadi (rang almashtirilsa grafiklar ham moslashadi). Bordo uchun
 * dataviz validatoridan o'tgan: yorug' — #963b55 (L 0.43–0.77 oralig'ida, oq fonda ≥3:1), qorong'i — #b45b74
 * (L 0.48–0.67, #181818 fonda ≥3:1). Konteynerga [VIZ_ROOT] qo'yiladi, belgilarga `bg-(--viz-mark)`.
 */
export const VIZ_ROOT =
  '[--viz-mark:color-mix(in_srgb,var(--accent)_65%,var(--accent-ink))] dark:[--viz-mark:color-mix(in_srgb,var(--accent-ink)_60%,var(--accent))]'

/** O'qdagi "toza" qadam: 1, 2, 2.5, 5 × 10ⁿ. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

/** Y o'qi belgilari: 0 dan [max] gacha ~4 ta teng qadam. */
export function axisTicks(max: number, count = 4): number[] {
  const step = niceStep(max / count)
  const ticks = [0]
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  if (ticks.length < 2) ticks.push(step)
  return ticks
}

/** Foiz o'zgarish (oldingi qiymat 0 bo'lsa — yo'q). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
