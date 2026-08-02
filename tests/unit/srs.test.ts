import { describe, it, expect } from 'vitest'
import {
  INTERVALS,
  recordMistake,
  recordCorrect,
  dueOn,
  applyResult,
  type MistakeRecord,
} from '../../src/curriculum/srs'

const TODAY = '2026-08-03'

describe('間隔設定', () => {
  it('四階：3 / 7 / 21 / 60 天', () => {
    expect(INTERVALS).toEqual([3, 7, 21, 60])
  })
})

describe('recordMistake', () => {
  it('新錯的字進第一階，3 天後到期', () => {
    expect(recordMistake(undefined, '花', TODAY)).toEqual({
      kanji: '花',
      stage: 0,
      dueOn: '2026-08-06',
      updatedAt: TODAY,
    })
  })

  it('已在第三階又答錯 → 退到第二階，重新計時', () => {
    const prior: MistakeRecord = { kanji: '花', stage: 2, dueOn: '2026-08-24', updatedAt: '2026-08-03' }
    expect(recordMistake(prior, '花', TODAY)).toMatchObject({ stage: 1, dueOn: '2026-08-10' })
  })

  it('已在第一階又答錯 → 留在第一階，不會退成負的', () => {
    const prior: MistakeRecord = { kanji: '花', stage: 0, dueOn: '2026-08-06', updatedAt: TODAY }
    expect(recordMistake(prior, '花', TODAY)).toMatchObject({ stage: 0, dueOn: '2026-08-06' })
  })
})

describe('recordCorrect', () => {
  it('答對升一階，間隔拉長', () => {
    const prior: MistakeRecord = { kanji: '花', stage: 0, dueOn: '2026-08-06', updatedAt: TODAY }
    expect(recordCorrect(prior, TODAY)).toMatchObject({ stage: 1, dueOn: '2026-08-10' })
  })

  it('第四階答對 → 畢業，不再排入', () => {
    const prior: MistakeRecord = { kanji: '花', stage: 3, dueOn: TODAY, updatedAt: '2026-06-04' }
    expect(recordCorrect(prior, TODAY)).toBeNull()
  })
})

describe('dueOn 篩選', () => {
  const records: MistakeRecord[] = [
    { kanji: '花', stage: 0, dueOn: '2026-08-01', updatedAt: '2026-07-29' },
    { kanji: '山', stage: 1, dueOn: '2026-08-03', updatedAt: '2026-07-27' },
    { kanji: '川', stage: 2, dueOn: '2026-08-20', updatedAt: '2026-07-30' },
  ]

  it('只回傳今天或更早到期的', () => {
    expect(dueOn(records, TODAY).map((r) => r.kanji)).toEqual(['花', '山'])
  })

  it('過期最久的排最前面', () => {
    expect(dueOn(records, TODAY)[0]!.kanji).toBe('花')
  })

  it('沒有到期的就回空陣列', () => {
    expect(dueOn(records, '2026-07-01')).toEqual([])
  })
})

describe('applyResult：整批套用一回的結果', () => {
  it('錯的進錯題本，對的不進', () => {
    const next = applyResult([], { wrong: ['花'], right: ['山'] }, TODAY)
    expect(next.map((r) => r.kanji)).toEqual(['花'])
  })

  it('這一回沒考到的字不受影響', () => {
    const prior: MistakeRecord[] = [
      { kanji: '川', stage: 1, dueOn: '2026-08-20', updatedAt: '2026-07-30' },
    ]
    const next = applyResult(prior, { wrong: ['花'], right: [] }, TODAY)
    expect(next.find((r) => r.kanji === '川')).toEqual(prior[0])
  })

  it('答對已在錯題本的字 → 升階', () => {
    const prior: MistakeRecord[] = [
      { kanji: '花', stage: 0, dueOn: '2026-08-06', updatedAt: '2026-08-03' },
    ]
    const next = applyResult(prior, { wrong: [], right: ['花'] }, TODAY)
    expect(next.find((r) => r.kanji === '花')).toMatchObject({ stage: 1 })
  })

  it('第四階答對後從錯題本移除', () => {
    const prior: MistakeRecord[] = [
      { kanji: '花', stage: 3, dueOn: TODAY, updatedAt: '2026-06-04' },
    ]
    expect(applyResult(prior, { wrong: [], right: ['花'] }, TODAY)).toEqual([])
  })

  it('同一個字不會產生兩筆', () => {
    const next = applyResult([], { wrong: ['花', '花'], right: [] }, TODAY)
    expect(next).toHaveLength(1)
  })

  it('不會就地修改傳入的陣列', () => {
    const prior: MistakeRecord[] = []
    applyResult(prior, { wrong: ['花'], right: [] }, TODAY)
    expect(prior).toEqual([])
  })
})
