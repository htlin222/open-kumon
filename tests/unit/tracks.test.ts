import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  byJlpt,
  orderFor,
  jlptProgress,
  JLPT_KANJI_TARGET,
  ELEMENTARY_TOTAL,
  JLPT_LEVELS,
} from '../../src/curriculum/tracks'
import type { KanjiEntry } from '../../src/content/schema'

const all: KanjiEntry[] = [1, 2, 3, 4, 5].flatMap(
  (g) => JSON.parse(readFileSync(`content/kanji/${g}.json`, 'utf8')) as KanjiEntry[],
)
const g1 = JSON.parse(readFileSync('content/kanji/1.json', 'utf8')) as KanjiEntry[]

describe('JLPT 資料', () => {
  it('835 字中絕大多數有等級', () => {
    const withLevel = all.filter((e) => e.jlpt !== null)
    expect(all).toHaveLength(835)
    expect(withLevel.length / all.length).toBeGreaterThan(0.98)
  })

  it('等級只落在 1–5', () => {
    for (const e of all) {
      if (e.jlpt !== null) expect(JLPT_LEVELS).toContain(e.jlpt as never)
    }
  })

  it('N5 的字大多集中在低年級', () => {
    const n5 = all.filter((e) => e.jlpt === 5)
    const low = n5.filter((e) => e.grade <= 2)
    expect(low.length / n5.length).toBeGreaterThan(0.9)
  })
})

describe('byJlpt', () => {
  const ordered = byJlpt(all)

  it('不增不減，只是重排', () => {
    expect(ordered).toHaveLength(all.length)
    expect(new Set(ordered.map((e) => e.kanji)).size).toBe(all.length)
  })

  it('N5 全部排在 N4 之前', () => {
    const lastN5 = ordered.findLastIndex((e) => e.jlpt === 5)
    const firstN4 = ordered.findIndex((e) => e.jlpt === 4)
    expect(lastN5).toBeLessThan(firstN4)
  })

  it('等級由易到難', () => {
    const levels = ordered.filter((e) => e.jlpt !== null).map((e) => e.jlpt!)
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!).toBeLessThanOrEqual(levels[i - 1]!)
    }
  })

  it('沒有等級的字排在最後（不丟掉，但不優先）', () => {
    const firstNull = ordered.findIndex((e) => e.jlpt === null)
    if (firstNull !== -1) {
      expect(ordered.slice(firstNull).every((e) => e.jlpt === null)).toBe(true)
    }
  })

  it('同一級之內維持配当表原順序', () => {
    const n5InOriginal = all.filter((e) => e.jlpt === 5).map((e) => e.kanji)
    const n5InOrdered = ordered.filter((e) => e.jlpt === 5).map((e) => e.kanji)
    expect(n5InOrdered).toEqual(n5InOriginal)
  })

  it('走 JLPT 軸時，前 79 個字就把 N5 全部涵蓋', () => {
    const n5Count = all.filter((e) => e.jlpt === 5).length
    expect(ordered.slice(0, n5Count).every((e) => e.jlpt === 5)).toBe(true)
  })
})

describe('orderFor', () => {
  it('学年軸不改動順序', () => {
    expect(orderFor('grade', g1).map((e) => e.kanji)).toEqual(g1.map((e) => e.kanji))
  })

  it('学年軸回傳副本，不是原陣列', () => {
    expect(orderFor('grade', g1)).not.toBe(g1)
  })

  it('JLPT 軸會改動順序', () => {
    expect(orderFor('jlpt', all).map((e) => e.kanji)).not.toEqual(all.map((e) => e.kanji))
  })
})

describe('jlptProgress', () => {
  it('學了 1 年級全部之後，N5 已完成大半', () => {
    const learned = new Set(g1.map((e) => e.kanji))
    const n5 = jlptProgress(all, learned).find((r) => r.level === 5)!
    expect(n5.learned / n5.count).toBeGreaterThan(0.5)
  })

  it('什麼都沒學時全部為 0', () => {
    for (const r of jlptProgress(all, new Set())) expect(r.learned).toBe(0)
  })

  it('各級字數加總等於全部', () => {
    const sum = jlptProgress(all, new Set()).reduce((s, r) => s + r.count, 0)
    expect(sum).toBe(all.length)
  })
})

describe('N1 的天花板（必須明確記錄）', () => {
  it('小學六年只教 1026 字', () => {
    expect(ELEMENTARY_TOTAL).toBe(1026)
  })

  it('N1 需要的字數遠超過小學總量 —— 課程必須在某個時點跨出小學範圍', () => {
    expect(JLPT_KANJI_TARGET[1]).toBeGreaterThan(ELEMENTARY_TOTAL)
    expect(JLPT_KANJI_TARGET[1] - ELEMENTARY_TOTAL).toBeGreaterThan(1000)
  })

  it('N2 才是綁在配当表上的實際天花板', () => {
    expect(JLPT_KANJI_TARGET[2]).toBeLessThanOrEqual(ELEMENTARY_TOTAL)
  })
})
