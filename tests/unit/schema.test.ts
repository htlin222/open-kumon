import { describe, it, expect } from 'vitest'
import { GRADE_KANJI_COUNTS, KanjiEntrySchema } from '../../src/content/schema'

describe('学年別漢字配当表（令和2年度版）', () => {
  it('各年級字數符合文部科学省規定', () => {
    expect(GRADE_KANJI_COUNTS).toEqual({ 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191 })
  })

  it('1–5 年合計 835 字', () => {
    const total = ([1, 2, 3, 4, 5] as const).reduce((s, g) => s + GRADE_KANJI_COUNTS[g], 0)
    expect(total).toBe(835)
  })

  it('六年合計 1026 字', () => {
    const total = Object.values(GRADE_KANJI_COUNTS).reduce((s, n) => s + n, 0)
    expect(total).toBe(1026)
  })
})

describe('KanjiEntrySchema', () => {
  const valid = {
    kanji: '花',
    grade: 1,
    strokes: 7,
    on: ['カ'],
    kun: ['はな'],
    meaningZh: '花',
    kanjivgId: '082b1',
    openmoji: '1F337',
  }

  it('接受一筆完整資料', () => {
    expect(KanjiEntrySchema.safeParse(valid).success).toBe(true)
  })

  it('openmoji 可省略（抽象字沒有對應插圖）', () => {
    const { openmoji: _omit, ...withoutIllustration } = valid
    expect(KanjiEntrySchema.safeParse(withoutIllustration).success).toBe(true)
  })

  it('拒絕沒有任何讀音的字', () => {
    expect(KanjiEntrySchema.safeParse({ ...valid, on: [], kun: [] }).success).toBe(false)
  })

  it('拒絕超出 1–6 的年級', () => {
    expect(KanjiEntrySchema.safeParse({ ...valid, grade: 7 }).success).toBe(false)
  })

  it('拒絕格式錯誤的 kanjivgId', () => {
    expect(KanjiEntrySchema.safeParse({ ...valid, kanjivgId: '82b1' }).success).toBe(false)
    expect(KanjiEntrySchema.safeParse({ ...valid, kanjivgId: '082B1' }).success).toBe(false)
  })

  it('拒絕空的中文釋義', () => {
    expect(KanjiEntrySchema.safeParse({ ...valid, meaningZh: '' }).success).toBe(false)
  })
})
