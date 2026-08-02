import type { KanjiEntry } from '../content/schema'

/** 一回導入幾個新字。雙面 20 分鐘的份量下，3 個是上限 */
export const KANJI_PER_UNIT = 3

export interface KanjiUnit {
  grade: number
  /** 複習卷沒有回數 */
  unitNo: number | null
  kind: 'lesson' | 'review'
  /** 正面帶なぞり練習的字 */
  newKanji: KanjiEntry[]
  /** 背面看圖寫字的字 */
  reviewKanji: KanjiEntry[]
}

/** 正面最多放幾個字的なぞり練習（版面上限） */
export const FRONT_SLOTS = 3

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
/**
 * @param injected 課表引擎混進來的到期複習字。會被排到背面最前面 ——
 *   紙上沒出現的字，之後就不該出現在勾錯題的清單裡。
 */
export function buildUnit(
  entries: KanjiEntry[],
  grade: number,
  unitNo: number,
  injected: readonly string[] = [],
): KanjiUnit {
  const total = unitCount(entries)
  if (unitNo < 1 || unitNo > total) {
    throw new Error(`${grade} 年級只有 ${total} 回，沒有第 ${unitNo} 回`)
  }

  const start = (unitNo - 1) * KANJI_PER_UNIT
  const newKanji = entries.slice(start, start + KANJI_PER_UNIT)

  const byChar = new Map(entries.map((e) => [e.kanji, e]))
  // 到期字排最前面；沒有插圖的出不了看圖寫字的題，只能落掉
  const pinned = injected
    .map((k) => byChar.get(k))
    .filter((e): e is KanjiEntry => Boolean(e?.openmoji))

  const learned = entries.slice(0, start + KANJI_PER_UNIT).filter((e) => e.openmoji)
  const recent = learned.slice(-REVIEW_SLOTS).reverse()

  const seen = new Set(pinned.map((e) => e.kanji))
  const reviewKanji = [...pinned, ...recent.filter((e) => !seen.has(e.kanji))].slice(0, REVIEW_SLOTS)

  return { grade, unitNo, kind: 'lesson', newKanji, reviewKanji }
}

/**
 * 這一回實際會被檢查的字 = 紙上真的練到的字。
 *
 * 由練習單反推清單，而不是由課表反推 —— 否則會出現「勾錯題清單裡有個字，
 * 但那張紙上根本沒有它」的情況，孩子被問了一個沒練過的字。
 */
export function checkableOf(unit: KanjiUnit, injected: readonly string[] = []): string[] {
  const onPaper = new Set(unit.reviewKanji.map((e) => e.kanji))
  return [
    ...new Set([...unit.newKanji.map((e) => e.kanji), ...injected.filter((k) => onPaper.has(k))]),
  ]
}

/**
 * 複習卷：只練指定的字，不導入新字。
 *
 * 正面取前 FRONT_SLOTS 個做なぞり（版面塞不下更多），
 * 背面把有插圖的字全部排成看圖寫字。沒有插圖的字出不了背面的題，
 * 但正面仍然練得到 —— 所以順序以「到期最久」為準，不因插圖有無而重排。
 */
export function buildReviewUnit(
  entries: KanjiEntry[],
  grade: number,
  kanji: readonly string[],
): KanjiUnit {
  const byChar = new Map(entries.map((e) => [e.kanji, e]))
  const picked = kanji.map((k) => byChar.get(k)).filter((e): e is KanjiEntry => Boolean(e))

  return {
    grade,
    unitNo: null,
    kind: 'review',
    newKanji: picked.slice(0, FRONT_SLOTS),
    reviewKanji: picked.filter((e) => e.openmoji).slice(0, REVIEW_SLOTS),
  }
}
