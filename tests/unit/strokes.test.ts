import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import type { KanjiEntry } from '../../src/content/schema'
import type { StrokeData } from '../../src/content/strokes'

const strokes = JSON.parse(readFileSync('content/strokes/1.json', 'utf8')) as Record<
  string,
  StrokeData
>
const entries = JSON.parse(readFileSync('content/kanji/1.json', 'utf8')) as KanjiEntry[]

describe('KanjiVG 筆順', () => {
  it('1 年級 80 字全部有筆順資料', () => {
    const missing = entries.filter((e) => !strokes[e.kanji])
    expect(missing.map((e) => e.kanji).join(''), '缺筆順').toBe('')
  })

  it('筆畫數與 KANJIDIC 的 strokes 欄位一致', () => {
    const mismatched = entries
      .filter((e) => strokes[e.kanji]!.paths.length !== e.strokes)
      .map((e) => `${e.kanji}(KanjiVG ${strokes[e.kanji]!.paths.length} vs KANJIDIC ${e.strokes})`)
    expect(mismatched, mismatched.join(', ')).toHaveLength(0)
  })

  it('「花」有 7 筆', () => {
    expect(strokes['花']!.paths).toHaveLength(7)
  })

  it('viewBox 是 KanjiVG 標準的 109×109', () => {
    for (const [ch, d] of Object.entries(strokes)) {
      expect(d.viewBox, ch).toBe('0 0 109 109')
    }
  })

  it('每一筆都是合法的 SVG path，且以 M 起始', () => {
    for (const [ch, d] of Object.entries(strokes)) {
      for (const p of d.paths) expect(p, `${ch}: ${p.slice(0, 20)}`).toMatch(/^M-?[\d.]/)
    }
  })

  it('筆順編號位置數量與筆畫數相同', () => {
    for (const [ch, d] of Object.entries(strokes)) {
      expect(d.numbers.length, ch).toBe(d.paths.length)
    }
  })

  it('編號座標落在 viewBox 範圍內', () => {
    for (const [ch, d] of Object.entries(strokes)) {
      for (const [x, y] of d.numbers) {
        expect(x, `${ch} x`).toBeGreaterThanOrEqual(0)
        expect(x, `${ch} x`).toBeLessThanOrEqual(109)
        expect(y, `${ch} y`).toBeGreaterThanOrEqual(0)
        expect(y, `${ch} y`).toBeLessThanOrEqual(109)
      }
    }
  })

  it('不含原始 SVG 文字（只留 path d，體積差 10 倍）', () => {
    const raw = readFileSync('content/strokes/1.json', 'utf8')
    expect(raw).not.toContain('<svg')
    expect(raw).not.toContain('kvg:')
  })
})
