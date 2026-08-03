import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeKanjiGuard } from '../../src/content/guard'
import type { VocabEntry } from '../../scripts/build-vocab'

const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>
const guard = makeKanjiGuard(table)
const vocab = Object.fromEntries(
  [1, 2, 3, 4, 5].map((g) => [
    g,
    JSON.parse(readFileSync(`content/vocab/${g}.json`, 'utf8')) as VocabEntry[],
  ]),
) as Record<number, VocabEntry[]>

const GRADES = [1, 2, 3, 4, 5] as const

describe('語彙資料', () => {
  it.each(GRADES)('%i 年級有 300 詞', (g) => {
    expect(vocab[g]).toHaveLength(300)
  })

  it.each(GRADES)('%i 年級：每個詞的漢字都不超綱', (g) => {
    const bad = vocab[g]!.filter((e) => !guard.check(e.ja, g).ok)
    expect(bad.map((e) => e.ja), `超綱：${bad.map((e) => e.ja).join(' ')}`).toHaveLength(0)
  })

  it.each(GRADES)('%i 年級：例句的漢字也都不超綱', (g) => {
    const bad = vocab[g]!.filter((e) => e.example && !guard.check(e.example, g).ok)
    expect(bad.map((e) => e.example), `例句超綱：${bad.length} 句`).toHaveLength(0)
  })

  it.each(GRADES)('%i 年級：每個詞都有讀音', (g) => {
    for (const e of vocab[g]!) expect(e.reading.length, e.ja).toBeGreaterThan(0)
  })

  it.each(GRADES)('%i 年級：讀音是純假名（漢字要靠孩子自己讀）', (g) => {
    for (const e of vocab[g]!) {
      expect(e.reading, `${e.ja} → ${e.reading}`).not.toMatch(/\p{Script=Han}/u)
    }
  })

  it.each(GRADES)('%i 年級：沒有重複的詞', (g) => {
    const forms = vocab[g]!.map((e) => e.ja)
    expect(new Set(forms).size).toBe(forms.length)
  })

  it.each(GRADES)('%i 年級：每個詞至少用到一個該年級新學的字', (g) => {
    const fresh = new Set(table[String(g)]!)
    for (const e of vocab[g]!) {
      expect([...e.ja].some((c) => fresh.has(c)), `${e.ja} 沒用到 ${g} 年級的新字`).toBe(true)
    }
  })

  it('例句長度控制在小學生讀得完的範圍', () => {
    for (const g of GRADES) {
      for (const e of vocab[g]!) {
        if (e.example) expect(e.example.length, e.example).toBeLessThanOrEqual(28)
      }
    }
  })

  it('2 年級以上例句覆蓋率 ≥ 80%', () => {
    for (const g of [2, 3, 4, 5] as const) {
      const withEx = vocab[g]!.filter((e) => e.example).length
      expect(withEx / vocab[g]!.length, `${g}年級`).toBeGreaterThanOrEqual(0.8)
    }
  })

  it('1 年級例句少是預期的 —— 全句只能用 80 個字，能用的句子本來就稀少', () => {
    const withEx = vocab[1]!.filter((e) => e.example).length
    expect(withEx).toBeGreaterThan(20)
    expect(withEx / 300).toBeLessThan(0.5)
  })

  it('沒有罕用漢字寫法混入（rK/iK 已濾掉）', () => {
    const all = GRADES.flatMap((g) => vocab[g]!)
    // 這幾個是先前實際混進來過的罕用寫法，用它們當哨兵
    for (const bad of ['これ等', '其れ', '何処']) {
      expect(all.map((e) => e.ja)).not.toContain(bad)
    }
  })
})
