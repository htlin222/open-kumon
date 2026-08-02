import type { StrokeData } from '../../content/strokes'

/**
 * 逐筆累積的筆順條。
 *
 * 日本教材的標準做法：一格一格把字寫出來，第 N 格顯示前 N 筆，
 * 最新的一筆畫粗、之前的畫淡。
 *
 * 這比在範字上標數字好 —— KanjiVG 的編號座標是為大尺寸設計的，
 * 縮到 34mm 時「早」的 1 到 6 會疊成一團，孩子根本讀不出順序。
 */

const PREVIOUS = '#bdbdbd'
const CURRENT = '#111'

export interface StrokeOrderStripProps {
  data: StrokeData
  /** 每一格的邊長（mm） */
  stepMm?: number
}

export function StrokeOrderStrip({ data, stepMm = 11 }: StrokeOrderStripProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5mm',
        maxWidth: `${stepMm * 6 + 9}mm`,
      }}
    >
      {data.paths.map((_, step) => (
        <div
          key={step}
          style={{
            width: `${stepMm}mm`,
            height: `${stepMm}mm`,
            border: '1px solid var(--ink-guide)',
            boxSizing: 'border-box',
            flex: '0 0 auto',
          }}
        >
          <svg viewBox={data.viewBox} width="100%" height="100%" style={{ display: 'block' }}>
            {data.paths.slice(0, step + 1).map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={i === step ? CURRENT : PREVIOUS}
                strokeWidth={i === step ? 7 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        </div>
      ))}
    </div>
  )
}
