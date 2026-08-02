import type { KanjiEntry } from '../content/schema'

/** 一回導入幾個新字。雙面 20 分鐘的份量下，3 個是上限 */
export const KANJI_PER_UNIT = 3

export interface KanjiUnit {
  grade: number
  unitNo: number
  /** 這一回導入的新字 */
  newKanji: KanjiEntry[]
  /** 這一回會複習到的舊字（背面的看圖寫字會用到） */
  reviewKanji: KanjiEntry[]
}

/** 背面「看圖寫字」的題數 */
const REVIEW_SLOTS = 10

export function unitCount(entries: KanjiEntry[]): number {
  return Math.ceil(entries.length / KANJI_PER_UNIT)
}

/**
 * 取出第 unitNo 回（1-based）。
 *
 * 新字取配当表順序的下三個；背面複習題從「這一回及之前出現過、且有插圖」的
 * 字裡取 —— 沒有插圖就沒辦法出看圖寫字的題目。
 */
export function buildUnit(entries: KanjiEntry[], grade: number, unitNo: number): KanjiUnit {
  const total = unitCount(entries)
  if (unitNo < 1 || unitNo > total) {
    throw new Error(`${grade} 年級只有 ${total} 回，沒有第 ${unitNo} 回`)
  }

  const start = (unitNo - 1) * KANJI_PER_UNIT
  const newKanji = entries.slice(start, start + KANJI_PER_UNIT)

  const learned = entries.slice(0, start + KANJI_PER_UNIT).filter((e) => e.openmoji)
  // 從最近學的往回取，讓複習集中在還沒穩固的字上
  const reviewKanji = learned.slice(-REVIEW_SLOTS).reverse()

  return { grade, unitNo, newKanji, reviewKanji }
}
