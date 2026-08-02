import kanji1 from '../../content/kanji/1.json'
import strokes1 from '../../content/strokes/1.json'
import type { KanjiEntry } from './schema'
import type { StrokeData } from './strokes'

/**
 * 已建構好的內容。build-time 產出、進 git、可人工校對。
 * 之後補完 2–5 年級的釋義後在這裡加進來即可。
 */
export const KANJI_BY_GRADE: Record<number, KanjiEntry[]> = {
  1: kanji1 as KanjiEntry[],
}

export const STROKES_BY_GRADE: Record<number, Record<string, StrokeData>> = {
  1: strokes1 as Record<string, StrokeData>,
}

export const AVAILABLE_GRADES = Object.keys(KANJI_BY_GRADE).map(Number).sort()
