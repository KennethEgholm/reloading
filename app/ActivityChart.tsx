// Server-rendered monthly activity chart (static SVG, zero client JS).
//
// Bars: rounds fired (accent) + rounds loaded (same accent at 45% via
// color-mix) per month, last 12 months. All colors flow through the
// --accent CSS vars, so copper/brass/field and dark mode are automatic.
// The container is responsive: the SVG has a viewBox and width=100%.

import { getTranslations } from 'next-intl/server'
import type { MonthlyActivity } from '@/lib/monthlyActivity'

interface ActivityChartProps {
  buckets: MonthlyActivity[]
  locale: string
}

const WIDTH = 720
const HEIGHT = 180
const PAD_LEFT = 36
const PAD_BOTTOM = 22
const PAD_TOP = 10
const PAD_RIGHT = 4
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM
const BAR_GAP = 3 // gap between the fired/loaded pair
const GROUP_GAP_RATIO = 0.42 // share of each group's width used as gap

function niceMax(value: number): number {
  if (value <= 0) return 10
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) {
    if (value <= s * magnitude) return s * magnitude
  }
  return 10 * magnitude
}

export async function ActivityChart({ buckets, locale }: ActivityChartProps) {
  const t = await getTranslations('overview')
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })

  const maxRaw = Math.max(0, ...buckets.map((b) => Math.max(b.fired, b.loaded)))
  const max = niceMax(maxRaw)
  const y = (v: number) => PAD_TOP + PLOT_H * (1 - v / max)

  const groupW = PLOT_W / buckets.length
  const barW = (groupW * (1 - GROUP_GAP_RATIO) - BAR_GAP) / 2

  const gridValues = [0, max / 2, max]
  const total = buckets.reduce((s, b) => s + b.fired + b.loaded, 0)
  if (total === 0) return null

  return (
    <figure className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <figcaption className="font-display text-lg font-semibold">{t('sections.activity')}</figcaption>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3 h-3 rounded-[3px] inline-block bg-accent" />
            {t('sections.activityFired')}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-[3px] inline-block"
              style={{ background: 'color-mix(in oklab, var(--accent) 45%, transparent)' }}
            />
            {t('sections.activityLoaded')}
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={t('sections.activityAria')}
        className="font-mono text-[10px] fill-zinc-400 dark:fill-zinc-500"
      >
        {/* gridlines + y labels */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-700"
              strokeWidth={1}
              strokeDasharray={v === 0 ? undefined : '3 3'}
            />
            <text x={0} y={y(v) + 3} className="fill-zinc-400 dark:fill-zinc-500">
              {v}
            </text>
          </g>
        ))}

        {/* bars */}
        {buckets.map((b, i) => {
          const gx = PAD_LEFT + i * groupW + (groupW * GROUP_GAP_RATIO) / 2
          const firedH = (b.fired / max) * PLOT_H
          const loadedH = (b.loaded / max) * PLOT_H
          const label = monthFormatter.format(b.start)
          const cx = gx + groupW * (1 - GROUP_GAP_RATIO) / 2
          return (
            <g key={b.key}>
              {b.fired > 0 && (
                <rect
                  x={gx}
                  y={y(b.fired)}
                  width={barW}
                  height={firedH}
                  rx={2}
                  fill="var(--accent)"
                >
                  <title>{`${t('sections.activityFired')}: ${b.fired} — ${label}`}</title>
                </rect>
              )}
              {b.loaded > 0 && (
                <rect
                  x={gx + barW + BAR_GAP}
                  y={y(b.loaded)}
                  width={barW}
                  height={loadedH}
                  rx={2}
                  fill="color-mix(in oklab, var(--accent) 45%, transparent)"
                >
                  <title>{`${t('sections.activityLoaded')}: ${b.loaded} — ${label}`}</title>
                </rect>
              )}
              <text x={cx} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}