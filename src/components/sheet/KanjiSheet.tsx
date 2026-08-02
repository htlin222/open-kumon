import { PencilSimple, Eye } from '@phosphor-icons/react'
import { WritingCell } from './WritingCell'
import { TraceGlyph } from './TraceGlyph'
import { Illustration } from './Illustration'
import { StrokeOrderStrip } from './StrokeOrderStrip'
import { pickForSheet } from '../../content/readings'
import type { KanjiEntry } from '../../content/schema'
import type { StrokeData } from '../../content/strokes'
import type { KanjiUnit } from '../../curriculum/units'

const TRACE_MM = 28
/** 帶筆順編號的範字要更大 —— 編號的實際字級跟著它縮放（見 TraceGlyph.NUMBER_SIZE）*/
const MODEL_MM = 34
const CELL_MM = 26
/** 插圖與書寫區的實際間距，須大於 MIN.clearanceMm (5mm) */
const GAP_MM = 8

export interface KanjiSheetProps {
  unit: KanjiUnit
  strokes: Record<string, StrokeData>
  side: 'front' | 'back'
}

/**
 * 漢字回的練習單。
 *
 * 紙面 100% 日文 —— 中文全部留在螢幕上。孩子讀不懂指示語沒關係，
 * 每個題組旁邊的圖示就是指示語的翻譯：鉛筆 = 寫，眼睛 = 看。
 */
export function KanjiSheet({ unit, strokes, side }: KanjiSheetProps) {
  return side === 'front' ? (
    <Front unit={unit} strokes={strokes} />
  ) : (
    <Back unit={unit} />
  )
}

function Header({ unit, side }: { unit: KanjiUnit; side: string }) {
  return (
    <div className="sheet__header">
      <h1 className="sheet__title">
        かん字 {unit.grade}年生 ・ だい{unit.unitNo}かい
        <span style={{ fontSize: '10pt', marginLeft: '3mm', color: '#666' }}>
          {side === 'front' ? 'おもて' : 'うら'}
        </span>
      </h1>
      <div className="sheet__meta" style={{ display: 'flex', gap: '6mm' }}>
        <span>
          なまえ{' '}
          <span
            data-write-zone=""
            style={{
              display: 'inline-block',
              width: '34mm',
              borderBottom: '1px solid var(--ink-rule)',
            }}
          />
        </span>
        <span>
          ひづけ{' '}
          <span
            data-write-zone=""
            style={{
              display: 'inline-block',
              width: '24mm',
              borderBottom: '1px solid var(--ink-rule)',
            }}
          />
        </span>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div className="sheet__footer">
      <span>open-kumon</span>
      <span className="sheet__credit">
        筆順 KanjiVG (CC BY-SA 3.0) ・ 絵 OpenMoji (CC BY-SA 4.0)
      </span>
    </div>
  )
}

function Front({ unit, strokes }: { unit: KanjiUnit; strokes: Record<string, StrokeData> }) {
  return (
    <section className="sheet">
      <Header unit={unit} side="front" />

      <p className="instruction">
        <PencilSimple size={20} weight="duotone" />
        あたらしい かん字を なぞって かきましょう。
      </p>

      {unit.newKanji.map((k) => (
        <KanjiBlock key={k.kanji} entry={k} data={strokes[k.kanji]!} />
      ))}

      <Footer />
    </section>
  )
}

function KanjiBlock({ entry, data }: { entry: KanjiEntry; data: StrokeData }) {
  const on = pickForSheet(entry.on, 2)
  const kun = pickForSheet(entry.kun, 2)

  return (
    <div style={{ marginBottom: '7mm' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', marginBottom: '4mm' }}>
        <TraceGlyph data={data} variant="model" sizeMm={MODEL_MM} />

        {/*
          圖必須緊貼漢字。紙上沒有中文，這張圖是孩子唯一能推出字義的線索 ——
          把它推到頁面另一端（marginLeft:auto）就等於切斷了那條連結。
        */}
        {entry.openmoji && (
          <Illustration code={entry.openmoji} sizeMm={20} label={entry.kanji} />
        )}

        <div style={{ fontSize: '13pt', lineHeight: 1.8, marginLeft: '2mm', flex: '0 0 auto' }}>
          {on.length > 0 && <div>おん　{on.join('・')}</div>}
          {kun.length > 0 && <div>くん　{kun.join('・')}</div>}
          <div style={{ fontSize: '10pt', color: '#666' }}>{data.paths.length}かく</div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <StrokeOrderStrip data={data} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '3mm', alignItems: 'center' }}>
        <TraceGlyph data={data} sizeMm={TRACE_MM} />
        <TraceGlyph data={data} sizeMm={TRACE_MM} />
        <WritingCell sizeMm={CELL_MM} />
        <WritingCell sizeMm={CELL_MM} />
        <WritingCell sizeMm={CELL_MM} />
      </div>
    </div>
  )
}

function Back({ unit }: { unit: KanjiUnit }) {
  return (
    <section className="sheet">
      <Header unit={unit} side="back" />

      <p className="instruction">
        <Eye size={20} weight="duotone" />
        えを みて、かん字を かきましょう。
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          rowGap: '10mm',
          columnGap: '10mm',
          marginTop: '5mm',
        }}
      >
        {unit.reviewKanji.map((k, i) => (
          <div key={k.kanji} style={{ display: 'flex', alignItems: 'center', gap: `${GAP_MM}mm` }}>
            <span style={{ fontSize: '12pt', color: '#666', width: '7mm' }}>{i + 1}</span>
            <Illustration code={k.openmoji!} sizeMm={22} label={k.kanji} />
            <WritingCell sizeMm={CELL_MM} />
          </div>
        ))}
      </div>

      <Footer />
    </section>
  )
}
