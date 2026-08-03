import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  startPlacement,
  answer,
  currentProbe,
  gradeFrom,
  KANA_PASS,
  GRAMMAR_PASS,
  type PlacementState,
  type ProbeSource,
} from '../../src/placement/engine'
import { kanaProbes, kanjiProbes, GRAMMAR_PROBES } from '../../src/placement/probes'
import type { KanjiEntry } from '../../src/content/schema'

const byGrade: Record<number, KanjiEntry[]> = Object.fromEntries(
  [1, 2, 3, 4, 5].map((g) => [
    g,
    JSON.parse(readFileSync(`content/kanji/${g}.json`, 'utf8')) as KanjiEntry[],
  ]),
)

const src: ProbeSource = {
  kana: kanaProbes,
  kanji: (grade, count) => kanjiProbes(byGrade[grade]!, grade, count),
  grammar: GRAMMAR_PROBES,
}

/** 依策略作答直到結束 */
function run(strategy: (s: PlacementState) => string): PlacementState {
  let s = startPlacement(src)
  let guard = 0
  while (s.phase.stage !== 'done' && guard++ < 100) s = answer(s, strategy(s), src)
  return s
}

const allRight = (s: PlacementState) => currentProbe(s)!.answer
const allWrong = (s: PlacementState) =>
  currentProbe(s)!.choices.find((c) => c !== currentProbe(s)!.answer)!

describe('題庫', () => {
  it('假名題有 4 個選項且含正解', () => {
    for (const p of kanaProbes(6)) {
      expect(p.choices).toHaveLength(4)
      expect(p.choices).toContain(p.answer)
      expect(new Set(p.choices).size).toBe(4)
    }
  })

  it('指示語是中文，題目本體是日文', () => {
    for (const p of [...kanaProbes(4), ...kanjiProbes(byGrade[1]!, 1, 2)]) {
      expect(p.instruction).toMatch(/[一-鿿]/)
      expect(p.instruction).not.toMatch(/[ぁ-んァ-ヶ]/)
    }
  })

  it('同樣的輸入產生同樣的題（可重測、可比較）', () => {
    expect(kanaProbes(6)).toEqual(kanaProbes(6))
    expect(kanjiProbes(byGrade[3]!, 3, 2)).toEqual(kanjiProbes(byGrade[3]!, 3, 2))
  })

  it('漢字題的正解不會同時出現在干擾項', () => {
    for (const g of [1, 2, 3, 4, 5]) {
      for (const p of kanjiProbes(byGrade[g]!, g, 2)) {
        expect(p.choices.filter((c) => c === p.answer)).toHaveLength(1)
      }
    }
  })

  it('助詞題全部有 4 個選項', () => {
    for (const p of GRAMMAR_PROBES) expect(p.choices).toHaveLength(4)
  })
})

describe('假名段', () => {
  it('全錯 → 起點是假名，不再往下測漢字', () => {
    const s = run(allWrong)
    expect(s.phase.stage).toBe('done')
    const r = s.phase.stage === 'done' ? s.phase.result : null
    expect(r?.startGrade).toBe(0)
    expect(r?.needsKana).toBe(true)
  })

  it('假名沒過就結束，題數遠少於全程', () => {
    expect(run(allWrong).answered).toBe(6)
  })

  it('剛好達到及格線就繼續往下', () => {
    let s = startPlacement(src)
    for (let i = 0; i < 6; i++) {
      s = answer(s, i < KANA_PASS ? currentProbe(s)!.answer : 'zzz', src)
    }
    expect(s.phase.stage).toBe('kanji')
  })
})

describe('漢字二分搜尋', () => {
  it('全對 → 5 年級', () => {
    const s = run(allRight)
    expect(s.phase.stage === 'done' && s.phase.result.startGrade).toBe(5)
  })

  it('只有假名會、漢字全錯 → 1 年級', () => {
    const s = run((st) => (st.phase.stage === 'kana' ? allRight(st) : allWrong(st)))
    expect(s.phase.stage === 'done' && s.phase.result.startGrade).toBe(1)
  })

  it('二分搜尋每輪 2 題，最多 3 輪', () => {
    const s = run(allRight)
    expect(s.kanjiRounds.length).toBeLessThanOrEqual(3)
    for (const r of s.kanjiRounds) expect(r.total).toBe(2)
  })

  it('全程題數落在 3–5 分鐘可完成的範圍', () => {
    expect(run(allRight).answered).toBeLessThanOrEqual(20)
  })

  it('探測過的年級不重複', () => {
    const grades = run(allRight).kanjiRounds.map((r) => r.grade)
    expect(new Set(grades).size).toBe(grades.length)
  })
})

describe('gradeFrom', () => {
  it('取最低的沒通過年級', () => {
    expect(gradeFrom([{ grade: 3, correct: 2 }, { grade: 4, correct: 0 }])).toBe(4)
    expect(gradeFrom([{ grade: 3, correct: 0 }, { grade: 1, correct: 0 }])).toBe(1)
  })

  it('全部通過 → 5 年級（本專案上限）', () => {
    expect(gradeFrom([{ grade: 3, correct: 2 }, { grade: 5, correct: 1 }])).toBe(5)
  })
})

describe('助詞段', () => {
  it('全對 → 解鎖文法系列', () => {
    const s = run(allRight)
    expect(s.phase.stage === 'done' && s.phase.result.grammarReady).toBe(true)
  })

  it('低於及格線 → 不解鎖', () => {
    const s = run((st) => (st.phase.stage === 'grammar' ? allWrong(st) : allRight(st)))
    expect(s.phase.stage === 'done' && s.phase.result.grammarReady).toBe(false)
  })

  it('及格線是 3 / 4', () => expect(GRAMMAR_PASS).toBe(3))
})

describe('純函式性質', () => {
  it('同樣的作答序列得到同樣的結果', () => {
    expect(run(allRight)).toEqual(run(allRight))
  })

  it('不會就地修改傳入的狀態', () => {
    const s = startPlacement(src)
    const before = JSON.stringify(s)
    answer(s, 'zzz', src)
    expect(JSON.stringify(s)).toBe(before)
  })

  it('結束後再作答不會改變狀態', () => {
    const done = run(allRight)
    expect(answer(done, 'zzz', src)).toEqual(done)
  })
})
