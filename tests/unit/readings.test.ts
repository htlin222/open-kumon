import { describe, it, expect } from 'vitest'
import { parseReading, forPrint, pickForSheet } from '../../src/content/readings'

describe('parseReading', () => {
  it('拆出送假名', () => {
    expect(parseReading('ひと.つ')).toEqual({ stem: 'ひと', okurigana: 'つ', affixOnly: false })
  })

  it('沒有送假名時 okurigana 為空', () => {
    expect(parseReading('はな')).toEqual({ stem: 'はな', okurigana: '', affixOnly: false })
  })

  it('認得前綴與後綴標記', () => {
    expect(parseReading('-ノン').affixOnly).toBe(true)
    expect(parseReading('ひと-').affixOnly).toBe(true)
    expect(parseReading('-ノン').stem).toBe('ノン')
  })
})

describe('forPrint', () => {
  it('送假名印成括號', () => {
    expect(forPrint('ひと.つ')).toBe('ひと(つ)')
  })

  it('沒有標記的原樣輸出', () => {
    expect(forPrint('カ')).toBe('カ')
  })

  it('印出來不含 KANJIDIC 的標記符號', () => {
    for (const raw of ['ひと.つ', '-ノン', 'ひと-', 'おと']) {
      expect(forPrint(raw)).not.toMatch(/[.-]/)
    }
  })
})

describe('pickForSheet', () => {
  it('丟掉只用於複合詞的讀音', () => {
    expect(pickForSheet(['オン', 'イン', '-ノン'], 3)).toEqual(['オン', 'イン'])
  })

  it('最多取 limit 個', () => {
    expect(pickForSheet(['イチ', 'イツ'], 1)).toEqual(['イチ'])
  })

  it('空陣列回空陣列', () => {
    expect(pickForSheet([])).toEqual([])
  })
})
