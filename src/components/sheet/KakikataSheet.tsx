import { PencilSimple } from '@phosphor-icons/react'
import { TraceGlyph } from './TraceGlyph'
import { WritingCell } from './WritingCell'
import { StrokeOrderStrip } from './StrokeOrderStrip'
import type { KanjiEntry } from '../../content/schema'
import type { StrokeData } from '../../content/strokes'

/**
 * 書き方（書写）練習單。
 *
 * 跟漢字回的差別在目的：漢字回教「這個字是什麼、怎麼唸」，書き方只練
 * 「怎麼寫得正確又好看」。所以這裡沒有意味插圖、沒有讀音、沒有語意 ——
 * 版面只剩筆順與格子，孩子的注意力全部落在筆形上。
 *
 * 也因為如此，它不需要任何人工撰寫的日文內容：全部從 KanjiVG 的筆順資料產生。
 */

const MODEL_MM = 26
const TRACE_MM = 22
const CELL_MM = 22

export interface KakikataSheetProps {
  grade: number
  entries: KanjiEntry[]
  strokes: Record<string, StrokeData>
  side: 'front' | 'back'
}

export function KakikataSheet({ grade, entries, strokes, side }: KakikataSheetProps) {
  // 一面四個字，剛好填滿 A4；前四個放正面，後四個放背面
  const shown = side === 'front' ? entries.slice(0, 4) : entries.slice(4, 8)

  return (
    <section className="sheet">
      <div className="sheet__header">
        <h1 className="sheet__title">
          かきかた {grade}年生
          <span style={{ fontSize: '10pt', marginLeft: '3mm', color: '#666' }}>
            {side === 'front' ? 'おもて' : 'うら'}
          </span>
        </h1>
        <div className="sheet__meta" style={{ display: 'flex', gap: '6mm' }}>
          <span>
            なまえ{' '}
            <span
              data-write-zone=""
              style={{ display: 'inline-block', width: '34mm', borderBottom: '1px solid var(--ink-rule)' }}
            />
          </span>
          <span>
            ひづけ{' '}
            <span
              data-write-zone=""
              style={{ display: 'inline-block', width: '24mm', borderBottom: '1px solid var(--ink-rule)' }}
            />
          </span>
        </div>
      </div>

      <p className="instruction">
        <PencilSimple size={20} weight="duotone" />
        ひつじゅんに きをつけて、ていねいに かきましょう。
      </p>

      {shown.map((entry) => {
        const data = strokes[entry.kanji]
        if (!data) return null
        return (
          <div key={entry.kanji} style={{ marginBottom: '6mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', marginBottom: '3mm' }}>
              <TraceGlyph data={data} variant="model" sizeMm={MODEL_MM} />
              <div style={{ fontSize: '10pt', color: '#666', flex: '0 0 auto' }}>
                {data.paths.length}かく
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <StrokeOrderStrip data={data} stepMm={10} />
              </div>
            </div>

            {/* 描三次、自己寫四次 —— 書き方 的重點是重複到手記得住 */}
            <div style={{ display: 'flex', gap: '2.5mm', alignItems: 'center' }}>
              <TraceGlyph data={data} sizeMm={TRACE_MM} />
              <TraceGlyph data={data} sizeMm={TRACE_MM} />
              <TraceGlyph data={data} sizeMm={TRACE_MM} />
              <WritingCell sizeMm={CELL_MM} />
              <WritingCell sizeMm={CELL_MM} />
              <WritingCell sizeMm={CELL_MM} />
              <WritingCell sizeMm={CELL_MM} />
            </div>
          </div>
        )
      })}

      <div className="sheet__footer">
        <span>open-kumon</span>
        <span className="sheet__credit">筆順 KanjiVG (CC BY-SA 3.0)</span>
      </div>
    </section>
  )
}
