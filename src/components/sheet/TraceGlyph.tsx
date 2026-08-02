import { MIN, PX_PER_MM } from '../../print/units'
import type { StrokeData } from '../../content/strokes'

const MIN_MM = MIN.traceGlyph / PX_PER_MM

/** KanjiVG 原始 stroke-width 是 3；範字要粗一點才看得清楚 */
const STROKE_WIDTH = 4.5

/**
 * 筆順編號的字級，單位是 viewBox 的 user unit 而非 px。
 *
 * 實際印出來的大小 = NUMBER_SIZE / 109 × 範字邊長。
 * 30mm 的範字下，14 units ≈ 10.9pt，剛好過得了 9pt 的絕對下限。
 * 想改小心：這個值和範字尺寸是綁在一起的。
 */
const NUMBER_SIZE = 14

const COLOURS = {
  /** 給孩子照著描的淡灰 */
  trace: '#b0b0b0',
  /** 印在最前面的深色範字 */
  model: '#111',
} as const

export interface TraceGlyphProps {
  data: StrokeData
  variant?: keyof typeof COLOURS
  sizeMm?: number
  /** 顯示筆順編號（座標直接沿用 KanjiVG 的） */
  showNumbers?: boolean
}

/**
 * なぞり書き範字。
 *
 * 用 KanjiVG 的筆順路徑渲染，而不是用字型 —— 這樣才能分別控制
 * 「深色範字」與「淡灰描寫底稿」，也才能標筆順編號。
 */
export function TraceGlyph({
  data,
  variant = 'trace',
  sizeMm = MIN_MM,
  showNumbers = false,
}: TraceGlyphProps) {
  if (sizeMm < MIN_MM) {
    throw new Error(`範字 ${sizeMm}mm 小於下限 ${MIN_MM}mm —— 孩子看不清筆形`)
  }

  const colour = COLOURS[variant]

  return (
    <div
      data-trace-glyph=""
      data-write-zone={variant === 'trace' ? '' : undefined}
      style={{
        width: `${sizeMm}mm`,
        height: `${sizeMm}mm`,
        border: '1.2px solid var(--ink-rule)',
        boxSizing: 'border-box',
        flex: '0 0 auto',
      }}
    >
      <svg viewBox={data.viewBox} width="100%" height="100%" style={{ display: 'block' }}>
        <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="var(--ink-guide)" strokeDasharray="4 4" strokeWidth="1" />
        <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="var(--ink-guide)" strokeDasharray="4 4" strokeWidth="1" />

        {data.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={colour}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {showNumbers &&
          data.numbers.map(([x, y], i) => (
            <text
              key={i}
              x={x}
              y={y}
              fontSize={NUMBER_SIZE}
              fill="#6a6a6a"
              stroke="#fff"
              strokeWidth="2.5"
              paintOrder="stroke"
            >
              {i + 1}
            </text>
          ))}
      </svg>
    </div>
  )
}
