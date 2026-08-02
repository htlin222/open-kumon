import { MIN, PX_PER_MM } from '../../print/units'

const MIN_MM = MIN.writingCell / PX_PER_MM

export interface WritingCellProps {
  /** 邊長（mm）。不得小於 18mm —— 小於這個尺寸孩子寫不進去 */
  sizeMm?: number
  /** 淡色提示字。導入階段給，檢查階段不給 */
  hint?: string
}

/**
 * マス目書寫格：孩子下筆的地方。
 *
 * 帶 data-write-zone 標記，Playwright 稽核靠它確認插圖沒有侵入書寫區。
 * 格內只有十字リーダー（日本練習本標準的虛線輔助），不放任何裝飾。
 */
export function WritingCell({ sizeMm = MIN_MM, hint }: WritingCellProps) {
  if (sizeMm < MIN_MM) {
    throw new Error(`書寫格 ${sizeMm}mm 小於下限 ${MIN_MM}mm —— 孩子寫不進去`)
  }

  return (
    <div
      data-write-zone=""
      style={{
        position: 'relative',
        width: `${sizeMm}mm`,
        height: `${sizeMm}mm`,
        border: '1.2px solid var(--ink-rule)',
        boxSizing: 'border-box',
        flex: '0 0 auto',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <line x1="50" y1="0" x2="50" y2="100" stroke="var(--ink-guide)" strokeDasharray="4 4" strokeWidth="1" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--ink-guide)" strokeDasharray="4 4" strokeWidth="1" />
      </svg>

      {hint && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: `${sizeMm * 0.72}mm`,
            lineHeight: 1,
            color: 'var(--ink-trace)',
            pointerEvents: 'none',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}
