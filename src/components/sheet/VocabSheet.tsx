import { PencilSimple, Eye } from '@phosphor-icons/react'
import { WritingCell } from './WritingCell'
import { MIN, PX_PER_MM } from '../../print/units'

/**
 * 語彙練習單。
 *
 * 正面：看詞寫讀音。背面：看例句填詞。
 *
 * 紙面一個中文字都沒有，也一個生成的日文字都沒有 —— 詞、讀音、例句
 * 全部逐字引用自 JMdict 與 Tatoeba。孩子推不出詞義時，語境在例句裡，
 * 中文釋義在螢幕上。
 */

const CELL_MM = MIN.writingCell / PX_PER_MM

export interface VocabItem {
  ja: string
  reading: string
  example: string | null
}

export interface VocabSheetProps {
  grade: number
  items: VocabItem[]
  side: 'front' | 'back'
}

function Header({ grade, side }: { grade: number; side: string }) {
  return (
    <div className="sheet__header">
      <h1 className="sheet__title">
        ことば {grade}年生
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
  )
}

/** 一列假名格。讀音幾個音就給幾格 —— 格數本身就是提示 */
function KanaCells({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '2mm' }}>
      {Array.from({ length: count }, (_, i) => (
        <WritingCell key={i} sizeMm={CELL_MM} />
      ))}
    </div>
  )
}

export function VocabSheet({ grade, items, side }: VocabSheetProps) {
  // 一面五個，剛好填滿 A4
  const shown = side === 'front' ? items.slice(0, 5) : items.slice(5, 10)

  return (
    <section className="sheet">
      <Header grade={grade} side={side} />

      <p className="instruction">
        {side === 'front' ? (
          <>
            <PencilSimple size={20} weight="duotone" />
            ことばの よみかたを かきましょう。
          </>
        ) : (
          <>
            <Eye size={20} weight="duotone" />
            ＿＿＿ に あう ことばを かきましょう。
          </>
        )}
      </p>

      {shown.map((item) =>
        side === 'front' ? (
          <div key={item.ja} style={{ marginBottom: '9mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8mm', marginBottom: '3mm' }}>
              <span style={{ fontSize: '26pt', lineHeight: 1.1, flex: '0 0 auto' }}>{item.ja}</span>
              <KanaCells count={item.reading.length} />
            </div>
            {item.example && (
              <div style={{ fontSize: '13pt', color: '#333' }}>{item.example}</div>
            )}
          </div>
        ) : (
          <div key={item.ja} style={{ marginBottom: '10mm' }}>
            <div style={{ fontSize: '14pt', marginBottom: '3mm' }}>
              {item.example
                ? item.example.split(item.ja).join('　＿＿＿　')
                : `＿＿＿（${item.reading}）`}
            </div>
            <KanaCells count={Math.max(2, item.ja.length)} />
          </div>
        ),
      )}

      <div className="sheet__footer">
        <span>open-kumon</span>
        <span className="sheet__credit">
          ことば JMdict (CC BY-SA 4.0) ・ 例文 Tatoeba (CC BY 2.0 FR)
        </span>
      </div>
    </section>
  )
}
