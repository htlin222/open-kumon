import { useEffect, useRef, useState, type ReactNode } from 'react'
import { KanjiSheet } from '../components/sheet/KanjiSheet'
import { KakikataSheet } from '../components/sheet/KakikataSheet'
import { VocabSheet } from '../components/sheet/VocabSheet'
import { STROKES_BY_GRADE, KANJI_BY_GRADE, VOCAB_BY_GRADE, earlierGrades } from '../content/registry'
import { buildUnit, unitCount, type KanjiUnit } from '../curriculum/units'
import { A4 } from '../print/units'

export interface PreviewParams {
  /** 'kanji'（預設）或 'kakikata' */
  series: string
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
    series: q.get('series') ?? 'kanji',
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
  const sheets = sides.map((s) =>
    unit.kind === 'writing' ? (
      <KakikataSheet key={s} grade={unit.grade} entries={unit.newKanji} strokes={strokes} side={s} />
    ) : (
      <KanjiSheet key={s} unit={unit} strokes={strokes} side={s} />
    ),
  )

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

  if (params.series === 'vocab') {
    const words = VOCAB_BY_GRADE[params.grade] ?? []
    // 一回 10 個詞：正面 5 個寫讀音，背面 5 個填詞
    const items = words.filter((w) => w.example).slice((unitNo - 1) * 10, unitNo * 10)
    const sides: ('front' | 'back')[] = params.side === 'both' ? ['front', 'back'] : [params.side]
    const sheets = sides.map((s) => (
      <VocabSheet key={s} grade={params.grade} items={items} side={s} />
    ))
    // 稽核模式不縮放，讓 Playwright 量到真實尺寸；螢幕上要縮
    if (params.raw) return <>{sheets}</>
    return (
      <div style={{ display: 'grid', gap: 24 }}>
        {sheets.map((sheet, i) => (
          <ScaledSheet key={i}>{sheet}</ScaledSheet>
        ))}
      </div>
    )
  }

  if (params.series === 'kakikata') {
    // 書き方 練的是「到這一回為止最近學的 6 個字」
    const learned = entries.slice(0, unitNo * 3)
    const unit = {
      grade: params.grade,
      unitNo: null,
      kind: 'writing' as const,
      newKanji: learned.slice(-8),
      reviewKanji: [],
    }
    return <SheetStack unit={unit} side={params.side} scaled={!params.raw} />
  }

  const unit = buildUnit(entries, params.grade, unitNo, [], earlierGrades(params.grade))
  return <SheetStack unit={unit} side={params.side} scaled={!params.raw} />
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
