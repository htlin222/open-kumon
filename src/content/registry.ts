import kanji1 from '../../content/kanji/1.json'
import kanji2 from '../../content/kanji/2.json'
import kanji3 from '../../content/kanji/3.json'
import kanji4 from '../../content/kanji/4.json'
import kanji5 from '../../content/kanji/5.json'
import strokes1 from '../../content/strokes/1.json'
import strokes2 from '../../content/strokes/2.json'
import strokes3 from '../../content/strokes/3.json'
import strokes4 from '../../content/strokes/4.json'
import strokes5 from '../../content/strokes/5.json'
import type { KanjiEntry } from './schema'
import type { StrokeData } from './strokes'

/**
 * 已建構好的內容。build-time 產出、進 git、可人工校對。
 * 1–5 年級全數建構完成（835 字）。
 */
export const KANJI_BY_GRADE: Record<number, KanjiEntry[]> = {
  1: kanji1 as KanjiEntry[],
  2: kanji2 as KanjiEntry[],
  3: kanji3 as KanjiEntry[],
  4: kanji4 as KanjiEntry[],
  5: kanji5 as KanjiEntry[],
}

// JSON 匯入時 numbers 被推成 number[][]，但實際結構是 [x, y] 的 tuple。
// TypeScript 無法從 JSON 字面值推出 tuple，所以要繞過 unknown。
export const STROKES_BY_GRADE: Record<number, Record<string, StrokeData>> = {
  1: strokes1 as unknown as Record<string, StrokeData>,
  2: strokes2 as unknown as Record<string, StrokeData>,
  3: strokes3 as unknown as Record<string, StrokeData>,
  4: strokes4 as unknown as Record<string, StrokeData>,
  5: strokes5 as unknown as Record<string, StrokeData>,
}

/** 某個年級之前所有已建構年級的字，由舊到新 */
export function earlierGrades(grade: number): KanjiEntry[] {
  return Object.keys(KANJI_BY_GRADE)
    .map(Number)
    .filter((g) => g < grade)
    .sort()
    .flatMap((g) => KANJI_BY_GRADE[g] ?? [])
}

export const AVAILABLE_GRADES = Object.keys(KANJI_BY_GRADE).map(Number).sort()
