import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { KanjiEntrySchema, GRADE_KANJI_COUNTS, type KanjiEntry } from '../../src/content/schema'

const entries = JSON.parse(readFileSync('content/kanji/1.json', 'utf8')) as KanjiEntry[]
const find = (ch: string) => entries.find((e) => e.kanji === ch)

describe('content/kanji/1.json', () => {
  it('字數 = 80', () => {
    expect(entries).toHaveLength(GRADE_KANJI_COUNTS[1])
  })

  it('每一筆都通過 schema', () => {
    for (const e of entries) {
      const r = KanjiEntrySchema.safeParse(e)
      expect(r.success, `${e.kanji}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true)
    }
  })

  it('grade 一律是 1（以配当表為準，不採信 kanjiapi 的舊表 grade）', () => {
    for (const e of entries) expect(e.grade, e.kanji).toBe(1)
  })

  it('「花」的資料正確', () => {
    expect(find('花')).toMatchObject({
      grade: 1,
      strokes: 7,
      on: ['カ', 'ケ'],
      kun: ['はな'],
      meaningZh: '花',
      kanjivgId: '082b1',
    })
  })

  it('讀音保留 KANJIDIC 原始標記（送假名 . 與接辭 -），留待版型層正規化', () => {
    // 「一」的訓読み是 ひと- / ひと.つ；印到紙上前要處理掉這些符號
    expect(find('一')?.kun).toContain('ひと.つ')
    expect(find('音')?.on).toContain('-ノン')
  })

  it('kanjivgId 是 code point 補零到 5 位小寫 hex', () => {
    expect(find('一')?.kanjivgId).toBe('04e00')
    expect(find('音')?.kanjivgId).toBe('097f3')
  })

  it('沒有重複的字', () => {
    const chars = entries.map((e) => e.kanji)
    expect(new Set(chars).size).toBe(chars.length)
  })

  it('順序與配当表一致（可重現）', () => {
    const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
      string,
      string[]
    >
    expect(entries.map((e) => e.kanji)).toEqual(table['1'])
  })
})
