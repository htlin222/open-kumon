import { useEffect, useRef, useState } from 'react'
import { KanjiSheet } from '../components/sheet/KanjiSheet'
import { KANJI_BY_GRADE, STROKES_BY_GRADE } from '../content/registry'
import { buildUnit, unitCount } from '../curriculum/units'
import { A4 } from '../print/units'

export interface PreviewParams {
  grade: number
  unitNo: number
  side: 'front' | 'back' | 'both'
  /** raw=1：只輸出紙面，不含任何 App 外殼。稽核用 */
  raw: boolean
}

export function parseParams(search: string): PreviewParams {
  const q = new URLSearchParams(search)
  return {
    grade: Number(q.get('grade') ?? 1),
    unitNo: Number(q.get('unit') ?? 1),
    side: (q.get('side') as PreviewParams['side']) ?? 'both',
    raw: q.get('raw') === '1',
  }
}

/** 把真實 A4 尺寸的 DOM 等比縮進容器。所見即所印 —— 因為它就是同一份 DOM */
function ScaledSheet({ children }: { children: React.ReactNode }) {
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

export function Preview({ params }: { params: PreviewParams }) {
  const entries = KANJI_BY_GRADE[params.grade]
  const strokes = STROKES_BY_GRADE[params.grade]

  if (!entries || !strokes) {
    return <Missing grade={params.grade} />
  }

  const total = unitCount(entries)
  const unitNo = Math.min(Math.max(1, params.unitNo), total)
  const unit = buildUnit(entries, params.grade, unitNo)

  const sides: ('front' | 'back')[] =
    params.side === 'both' ? ['front', 'back'] : [params.side]

  const sheets = sides.map((side) => (
    <KanjiSheet key={side} unit={unit} strokes={strokes} side={side} />
  ))

  // 稽核模式：不縮放、不加外殼，讓 Playwright 量到真實尺寸
  if (params.raw) return <>{sheets}</>

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {sheets.map((sheet, i) => (
        <ScaledSheet key={i}>{sheet}</ScaledSheet>
      ))}
    </div>
  )
}

function Missing({ grade }: { grade: number }) {
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
