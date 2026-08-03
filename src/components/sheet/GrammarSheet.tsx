import { PencilSimple } from '@phosphor-icons/react'
import { WritingCell } from './WritingCell'
import { MIN, PX_PER_MM } from '../../print/units'

/**
 * 助詞練習單。
 *
 * 句子來自 Tatoeba，答案是原句本來的助詞 —— 逐字引用，零生成。
 * 選項印在題目下方供參考，孩子把答案寫進格子裡（寫比圈選記得牢）。
 */

const CELL_MM = MIN.writingCell / PX_PER_MM

export interface GrammarItem {
  prompt: string
  answer: string
  choices: string[]
}

export interface GrammarSheetProps {
  grade: number
  items: GrammarItem[]
  side: 'front' | 'back'
}

export function GrammarSheet({ grade, items, side }: GrammarSheetProps) {
  const shown = side === 'front' ? items.slice(0, 5) : items.slice(5, 10)
  const offset = side === 'front' ? 0 : 5

  return (
    <section className="sheet">
      <div className="sheet__header">
        <h1 className="sheet__title">
          ことばと ぶん {grade}年生
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
        ＿ に あう じを かきましょう。
      </p>

      {shown.map((item, i) => (
        <div key={item.prompt} style={{ marginBottom: '9mm' }}>
          <div style={{ fontSize: '14pt', marginBottom: '2mm' }}>
            <span style={{ color: '#666', marginRight: '3mm' }}>{offset + i + 1}</span>
            {item.prompt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6mm' }}>
            <WritingCell sizeMm={CELL_MM} />
            <div style={{ fontSize: '12pt', color: '#555' }}>
              {item.choices.join('　・　')}
            </div>
          </div>
        </div>
      ))}

      <div className="sheet__footer">
        <span>open-kumon</span>
        <span className="sheet__credit">例文 Tatoeba (CC BY 2.0 FR)</span>
      </div>
    </section>
  )
}
