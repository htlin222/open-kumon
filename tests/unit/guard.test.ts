import { describe, it, expect } from 'vitest'
import { makeKanjiGuard } from '../../src/content/guard'

const guard = makeKanjiGuard({ 1: [...'花山川'], 2: [...'海空'] })

describe('配当表 guard', () => {
  it('放行同級與以下的字', () => {
    expect(guard.check('花が さく', 1)).toEqual({ ok: true, violations: [] })
    expect(guard.check('海と 山', 2)).toEqual({ ok: true, violations: [] })
  })

  it('擋下超綱的字', () => {
    expect(guard.check('海が ある', 1)).toEqual({
      ok: false,
      violations: [{ kanji: '海', requiredGrade: 2 }],
    })
  })

  it('擋下不在配当表內的字', () => {
    expect(guard.check('薔薇', 5)).toEqual({
      ok: false,
      violations: [
        { kanji: '薔', requiredGrade: null },
        { kanji: '薇', requiredGrade: null },
      ],
    })
  })

  it('忽略かな、標點與數字', () => {
    expect(guard.check('はな が さく。カタカナ 123 ！', 1).ok).toBe(true)
  })

  it('同一個違規字只回報一次', () => {
    expect(guard.check('海と海と海', 1).violations).toHaveLength(1)
  })

  it('空字串通過', () => {
    expect(guard.check('', 1).ok).toBe(true)
  })

  it('gradeOf 查得到字的年級', () => {
    expect(guard.gradeOf('花')).toBe(1)
    expect(guard.gradeOf('海')).toBe(2)
    expect(guard.gradeOf('薔')).toBeNull()
  })
})
