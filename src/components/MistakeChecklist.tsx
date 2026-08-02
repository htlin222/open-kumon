import { useState } from 'react'
import { Button, Checkbox } from '@primer/react'
import { IconCheck } from '@tabler/icons-react'
import type { KanjiEntry } from '../content/schema'

export interface MistakeChecklistProps {
  /** 這一回要檢查的字 */
  kanji: string[]
  /** 用來顯示中文釋義 */
  lookup: (kanji: string) => KanjiEntry | undefined
  onSubmit: (wrong: string[]) => void
  disabled?: boolean
}

/**
 * 寫完之後勾錯題。
 *
 * 刻意做成「勾錯的」而不是「勾對的」—— 大部分時候孩子大部分都對，
 * 勾錯的比較快，而且不會因為漏勾就把對的算成錯的。
 */
export function MistakeChecklist({ kanji, lookup, onSubmit, disabled }: MistakeChecklistProps) {
  const [wrong, setWrong] = useState<string[]>([])

  const toggle = (k: string) =>
    setWrong((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  return (
    <div>
      <div className="chrome__section-title">寫完了？勾出寫錯的字</div>

      {kanji.map((k) => {
        const entry = lookup(k)
        const checked = wrong.includes(k)
        return (
          <label
            key={k}
            className="chrome__check-row"
            data-checked={checked || undefined}
          >
            <Checkbox checked={checked} onChange={() => toggle(k)} disabled={disabled} />
            <span className="chrome__check-glyph">{k}</span>
            <span className="chrome__check-gloss">{entry?.meaningZh ?? ''}</span>
          </label>
        )
      })}

      <Button
        variant="primary"
        leadingVisual={IconCheck}
        className="chrome__print"
        disabled={disabled}
        onClick={() => onSubmit(wrong)}
      >
        {wrong.length === 0 ? '全部都對，完成' : `送出（${wrong.length} 個要複習）`}
      </Button>

      <div className="chrome__note">
        勾起來的字會在 3 天後回來，答對再變成 7 天、21 天、60 天。
        <br />
        混在之後的正課裡，孩子不會發現自己在複習。
      </div>
    </div>
  )
}
