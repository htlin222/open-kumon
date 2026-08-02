import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { GRADE_KANJI_COUNTS } from '../../src/content/schema'
import { ADDED_TO_G4, MOVED, PREFECTURE_KANJI } from '../../src/content/kyoiku-revision-2020'

const PATH = 'content/kyoiku-by-grade.json'
const table = (): Record<string, string[]> =>
  JSON.parse(readFileSync(PATH, 'utf8')) as Record<string, string[]>

describe('2020 改訂 patch 自洽性', () => {
  it('新加入 4 年級的就是 20 個都道府県漢字', () => {
    expect(ADDED_TO_G4).toEqual(PREFECTURE_KANJI)
    expect(ADDED_TO_G4).toHaveLength(20)
  })

  it('移動清單沒有重複的字', () => {
    const chars = MOVED.map((m) => m.kanji)
    expect(new Set(chars).size).toBe(chars.length)
  })

  it('套用 patch 後的字數增減與官方表一致', () => {
    const OLD = { 1: 80, 2: 160, 3: 200, 4: 200, 5: 185, 6: 181 }
    const delta: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const { from, to } of MOVED) {
      delta[from]! -= 1
      delta[to]! += 1
    }
    delta[4]! += ADDED_TO_G4.length

    for (const g of [1, 2, 3, 4, 5, 6] as const) {
      expect(OLD[g] + delta[g]!, `${g}年級`).toBe(GRADE_KANJI_COUNTS[g])
    }
  })
})

describe('現行配当表產出', () => {
  it('資料檔存在（先跑 pnpm data:fetch）', () => {
    expect(existsSync(PATH)).toBe(true)
  })

  it('每個年級字數正確', () => {
    const t = table()
    for (const [g, expected] of Object.entries(GRADE_KANJI_COUNTS)) {
      expect(t[g]?.length, `${g}年級`).toBe(expected)
    }
  })

  it('沒有任何字重複出現在兩個年級', () => {
    const all = Object.values(table()).flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('20 個都道府県漢字都在 4 年級', () => {
    const t = table()
    for (const k of PREFECTURE_KANJI) expect(t['4'], k).toContain(k)
  })

  it('從 4 年移出的字不再留在 4 年', () => {
    const t = table()
    for (const { kanji, from, to } of MOVED) {
      expect(t[String(from)], `${kanji} 應已離開 ${from} 年`).not.toContain(kanji)
      expect(t[String(to)], `${kanji} 應已進入 ${to} 年`).toContain(kanji)
    }
  })

  it('1–5 年合計 835 字', () => {
    const t = table()
    const total = [1, 2, 3, 4, 5].reduce((s, g) => s + t[String(g)]!.length, 0)
    expect(total).toBe(835)
  })
})
