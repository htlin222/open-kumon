import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  buildUnit,
  buildReviewUnit,
  unitCount,
  checkableOf,
  KANJI_PER_UNIT,
  FRONT_SLOTS,
} from '../../src/curriculum/units'
import type { KanjiEntry } from '../../src/content/schema'

const entries = JSON.parse(readFileSync('content/kanji/1.json', 'utf8')) as KanjiEntry[]

describe('unitCount', () => {
  it('80 字 ÷ 每回 3 字 = 27 回', () => {
    expect(KANJI_PER_UNIT).toBe(3)
    expect(unitCount(entries)).toBe(27)
  })
})

describe('buildUnit', () => {
  it('第 1 回是配当表的前三個字', () => {
    const u = buildUnit(entries, 1, 1)
    expect(u.newKanji.map((e) => e.kanji)).toEqual(['一', '七', '三'])
    expect(u.kind).toBe('lesson')
  })

  it('最後一回可能不滿 3 個字', () => {
    const u = buildUnit(entries, 1, 27)
    expect(u.newKanji.length).toBeGreaterThan(0)
    expect(u.newKanji.length).toBeLessThanOrEqual(KANJI_PER_UNIT)
  })

  it('背面只放有插圖的字（沒圖就出不了看圖寫字的題）', () => {
    const u = buildUnit(entries, 1, 20)
    expect(u.reviewKanji.every((e) => e.openmoji)).toBe(true)
  })

  it('背面從最近學的往回取', () => {
    const u = buildUnit(entries, 1, 20)
    const learnedSoFar = entries.slice(0, 20 * KANJI_PER_UNIT).map((e) => e.kanji)
    for (const e of u.reviewKanji) expect(learnedSoFar).toContain(e.kanji)
  })

  it('超出範圍的回數會丟錯', () => {
    expect(() => buildUnit(entries, 1, 0)).toThrow(/27/)
    expect(() => buildUnit(entries, 1, 28)).toThrow(/27/)
  })
})

describe('buildReviewUnit', () => {
  it('正面最多 3 個字', () => {
    const u = buildReviewUnit(entries, 1, [...'一七三山川花木日月'])
    expect(u.newKanji).toHaveLength(FRONT_SLOTS)
    expect(u.kind).toBe('review')
    expect(u.unitNo).toBeNull()
  })

  it('正面順序照傳入順序（到期最久的先練）', () => {
    const u = buildReviewUnit(entries, 1, [...'月日花'])
    expect(u.newKanji.map((e) => e.kanji)).toEqual(['月', '日', '花'])
  })

  it('背面只收有插圖的字', () => {
    const u = buildReviewUnit(entries, 1, [...'一七三山川花木日月'])
    expect(u.reviewKanji.every((e) => e.openmoji)).toBe(true)
  })

  it('忽略不在這個年級的字', () => {
    const u = buildReviewUnit(entries, 1, ['花', '薔'])
    expect(u.newKanji.map((e) => e.kanji)).toEqual(['花'])
  })

  it('空清單不會爆', () => {
    const u = buildReviewUnit(entries, 1, [])
    expect(u.newKanji).toEqual([])
    expect(u.reviewKanji).toEqual([])
  })
})

describe('混入的複習字', () => {
  it('被排到背面最前面（孩子在紙上真的練得到）', () => {
    const u = buildUnit(entries, 1, 20, ['花', '山'])
    expect(u.reviewKanji.slice(0, 2).map((e) => e.kanji)).toEqual(['花', '山'])
  })

  it('不會因為混入而重複出現', () => {
    const u = buildUnit(entries, 1, 27, ['花'])
    const chars = u.reviewKanji.map((e) => e.kanji)
    expect(new Set(chars).size).toBe(chars.length)
  })

  it('背面總數仍受上限約束', () => {
    const u = buildUnit(entries, 1, 27, [...'一七三山川花木日月目耳手足'])
    expect(u.reviewKanji.length).toBeLessThanOrEqual(10)
  })

  it('沒有插圖的字進不了背面', () => {
    // 「中」是抽象字，openmoji 對照表刻意留空
    const u = buildUnit(entries, 1, 20, ['中'])
    expect(u.reviewKanji.map((e) => e.kanji)).not.toContain('中')
  })
})

describe('checkableOf', () => {
  it('新字一定在清單裡', () => {
    const u = buildUnit(entries, 1, 1)
    expect(checkableOf(u)).toEqual(['一', '七', '三'])
  })

  it('混入且印在紙上的字也在清單裡', () => {
    const u = buildUnit(entries, 1, 20, ['花'])
    expect(checkableOf(u, ['花'])).toContain('花')
  })

  it('混入但沒印上紙的字不在清單裡（不能問沒練過的字）', () => {
    const u = buildUnit(entries, 1, 20, ['中'])
    expect(checkableOf(u, ['中'])).not.toContain('中')
  })

  it('不會重複', () => {
    const u = buildUnit(entries, 1, 20, ['花', '花'])
    const list = checkableOf(u, ['花', '花'])
    expect(new Set(list).size).toBe(list.length)
  })
})
