import { describe, it, expect } from 'vitest'
import { pickAssignment, REVIEW_THRESHOLD, MAX_INJECTED, streakOf } from '../../src/curriculum/schedule'
import type { MistakeRecord } from '../../src/curriculum/srs'

const TODAY = '2026-08-03'
const TOTAL_UNITS = 27

const due = (kanji: string, dueOn: string): MistakeRecord => ({
  kanji,
  stage: 0,
  dueOn,
  updatedAt: '2026-07-30',
})

const overdue = (n: number) =>
  Array.from({ length: n }, (_, i) => due(`字${i}`, '2026-08-01'))

describe('門檻設定', () => {
  it('到期 8 個就出複習卷，正課最多混入 3 個', () => {
    expect(REVIEW_THRESHOLD).toBe(8)
    expect(MAX_INJECTED).toBe(3)
  })
})

describe('pickAssignment', () => {
  it('沒有到期字 → 出下一回正課，不混入任何字', () => {
    const a = pickAssignment({ nextUnitNo: 5, totalUnits: TOTAL_UNITS, mistakes: [], today: TODAY })
    expect(a).toEqual({ kind: 'lesson', unitNo: 5, injected: [] })
  })

  it('到期未達門檻 → 正課並混入到期字', () => {
    const a = pickAssignment({
      nextUnitNo: 5,
      totalUnits: TOTAL_UNITS,
      mistakes: overdue(2),
      today: TODAY,
    })
    expect(a).toMatchObject({ kind: 'lesson', unitNo: 5 })
    expect(a.kind === 'lesson' && a.injected).toEqual(['字0', '字1'])
  })

  it('混入的字最多 3 個，即使到期 7 個', () => {
    const a = pickAssignment({
      nextUnitNo: 5,
      totalUnits: TOTAL_UNITS,
      mistakes: overdue(7),
      today: TODAY,
    })
    expect(a.kind === 'lesson' && a.injected).toHaveLength(MAX_INJECTED)
  })

  it('到期達 8 個 → 出複習卷，不推進主線', () => {
    const a = pickAssignment({
      nextUnitNo: 5,
      totalUnits: TOTAL_UNITS,
      mistakes: overdue(8),
      today: TODAY,
    })
    expect(a).toMatchObject({ kind: 'review' })
    expect(a.kind === 'review' && a.kanji).toHaveLength(8)
  })

  it('複習卷只收到期的字，未到期的不算進門檻', () => {
    const mistakes = [...overdue(7), due('未到期', '2026-12-01')]
    const a = pickAssignment({ nextUnitNo: 5, totalUnits: TOTAL_UNITS, mistakes, today: TODAY })
    expect(a.kind).toBe('lesson')
  })

  it('主線做完且沒有到期字 → finished', () => {
    const a = pickAssignment({
      nextUnitNo: TOTAL_UNITS + 1,
      totalUnits: TOTAL_UNITS,
      mistakes: [],
      today: TODAY,
    })
    expect(a).toEqual({ kind: 'finished' })
  })

  it('主線做完但還有到期字 → 繼續出複習卷', () => {
    const a = pickAssignment({
      nextUnitNo: TOTAL_UNITS + 1,
      totalUnits: TOTAL_UNITS,
      mistakes: overdue(3),
      today: TODAY,
    })
    expect(a.kind).toBe('review')
  })

  it('同一天重複呼叫回傳完全相同的結果（多開分頁不會跳題）', () => {
    const input = {
      nextUnitNo: 5,
      totalUnits: TOTAL_UNITS,
      mistakes: overdue(5),
      today: TODAY,
    }
    expect(pickAssignment(input)).toEqual(pickAssignment(input))
  })
})

describe('streakOf', () => {
  it('沒有紀錄 → 0', () => {
    expect(streakOf([], TODAY)).toBe(0)
  })

  it('今天寫了 → 1', () => {
    expect(streakOf(['2026-08-03'], TODAY)).toBe(1)
  })

  it('連續三天 → 3', () => {
    expect(streakOf(['2026-08-01', '2026-08-02', '2026-08-03'], TODAY)).toBe(3)
  })

  it('昨天寫了、今天還沒 → 連續仍然存活', () => {
    expect(streakOf(['2026-08-01', '2026-08-02'], TODAY)).toBe(2)
  })

  it('斷了兩天以上 → 歸零', () => {
    expect(streakOf(['2026-07-28', '2026-07-29'], TODAY)).toBe(0)
  })

  it('中間斷過只算最近這一段', () => {
    expect(streakOf(['2026-07-01', '2026-07-02', '2026-08-02', '2026-08-03'], TODAY)).toBe(2)
  })

  it('同一天寫兩次只算一天', () => {
    expect(streakOf(['2026-08-03', '2026-08-03', '2026-08-02'], TODAY)).toBe(2)
  })

  it('紀錄順序顛倒也算得對', () => {
    expect(streakOf(['2026-08-03', '2026-08-01', '2026-08-02'], TODAY)).toBe(3)
  })
})
