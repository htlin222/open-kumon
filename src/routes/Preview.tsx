import { useEffect, useRef, useState, type ReactNode } from 'react'
import { KanjiSheet } from '../components/sheet/KanjiSheet'
import { STROKES_BY_GRADE, KANJI_BY_GRADE } from '../content/registry'
import { buildUnit, unitCount, type KanjiUnit } from '../curriculum/units'
import { A4 } from '../print/units'

export interface PreviewParams {
  grade: number
  /** 指定回數；沒給就交給課表引擎決定 */
  unitNo: number | null
  side: 'front' | 'back' | 'both'
  /** raw=1：只輸出紙面，不含任何 App 外殼，也不碰進度。稽核用 */
  raw: boolean
}

export function parseParams(search: string): PreviewParams {
  const q = new URLSearchParams(search)
  const unit = q.get('unit')
  return {
    grade: Number(q.get('grade') ?? 1),
    unitNo: unit === null ? null : Number(unit),
    side: (q.get('side') as PreviewParams['side']) ?? 'both',
    raw: q.get('raw') === '1',
  }
}

/** 把真實 A4 尺寸的 DOM 等比縮進容器。所見即所印 —— 因為它就是同一份 DOM */
function ScaledSheet({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / A4.width))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={boxRef} style={{ width: '100%' }}>
      <div
        style={{
          width: A4.width,
          height: A4.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginBottom: scale < 1 ? A4.height * (scale - 1) : 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export interface SheetStackProps {
  unit: KanjiUnit
  side: PreviewParams['side']
  /** 稽核模式不縮放，讓 Playwright 量到真實尺寸 */
  scaled?: boolean
}

export function SheetStack({ unit, side, scaled = true }: SheetStackProps) {
  const strokes = STROKES_BY_GRADE[unit.grade]
  if (!strokes) return <Missing grade={unit.grade} />

  const sides: ('front' | 'back')[] = side === 'both' ? ['front', 'back'] : [side]
  const sheets = sides.map((s) => (
    <KanjiSheet key={s} unit={unit} strokes={strokes} side={s} />
  ))

  if (!scaled) return <>{sheets}</>

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {sheets.map((sheet, i) => (
        <ScaledSheet key={i}>{sheet}</ScaledSheet>
      ))}
    </div>
  )
}

/**
 * 稽核／自由瀏覽模式：直接從參數組出練習單，完全不碰進度。
 * 這保證 Playwright 的六道關卡跑起來與 localStorage 狀態無關。
 */
export function StaticPreview({ params }: { params: PreviewParams }) {
  const entries = KANJI_BY_GRADE[params.grade]
  if (!entries) return <Missing grade={params.grade} />

  const total = unitCount(entries)
  const unitNo = Math.min(Math.max(1, params.unitNo ?? 1), total)
  return <SheetStack unit={buildUnit(entries, params.grade, unitNo)} side={params.side} scaled={!params.raw} />
}

export function Missing({ grade }: { grade: number }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>{grade} 年級的內容還沒建構</h2>
      <p>
        還缺中文釋義。跑 <code>pnpm content:all</code> 之前，先把{' '}
        <code>content/source/meanings-zh.json</code> 補齊。
      </p>
    </div>
  )
}
