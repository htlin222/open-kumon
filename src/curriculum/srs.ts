import { addDays, isOnOrBefore, type DayKey } from './day'

/**
 * 間隔複習。
 *
 * 這是「回收」那一股力量 —— 沒有它，孩子只會一路往前走，
 * 每個字寫過一次就再也不會遇到，兩週後全忘光。
 *
 * 四階間隔取自設計文件：3 / 7 / 21 / 60 天。答對升階，答錯退階。
 * 第四階（60 天後）還答得出來，就當作真的記住了，畢業。
 */
export const INTERVALS = [3, 7, 21, 60] as const

export const MAX_STAGE = INTERVALS.length - 1

export interface MistakeRecord {
  kanji: string
  /** 0–3，對應 INTERVALS 的索引 */
  stage: number
  dueOn: DayKey
  updatedAt: DayKey
}

const schedule = (kanji: string, stage: number, today: DayKey): MistakeRecord => ({
  kanji,
  stage,
  dueOn: addDays(today, INTERVALS[stage]!),
  updatedAt: today,
})

/** 答錯：新字進第一階；已在錯題本的退一階並重新計時 */
export function recordMistake(
  prior: MistakeRecord | undefined,
  kanji: string,
  today: DayKey,
): MistakeRecord {
  const stage = prior ? Math.max(0, prior.stage - 1) : 0
  return schedule(kanji, stage, today)
}

/** 答對：升一階；已在最後一階則畢業（回 null，呼叫端負責移除） */
export function recordCorrect(prior: MistakeRecord, today: DayKey): MistakeRecord | null {
  if (prior.stage >= MAX_STAGE) return null
  return schedule(prior.kanji, prior.stage + 1, today)
}

/** 今天（含）之前到期的，過期最久的排最前面 */
export function dueOn(records: readonly MistakeRecord[], today: DayKey): MistakeRecord[] {
  return records
    .filter((r) => isOnOrBefore(r.dueOn, today))
    // YYYY-MM-DD 的字典序就是時間序；升序 = 過期最久的排最前面
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0))
}

export interface UnitResult {
  /** 這一回勾錯的字 */
  wrong: readonly string[]
  /** 這一回考到且答對的字 */
  right: readonly string[]
}

/**
 * 把一回的結果整批套用到錯題本。
 *
 * 只動這一回考到的字；沒考到的原樣保留。
 */
export function applyResult(
  records: readonly MistakeRecord[],
  result: UnitResult,
  today: DayKey,
): MistakeRecord[] {
  const byKanji = new Map(records.map((r) => [r.kanji, r]))

  for (const kanji of new Set(result.wrong)) {
    byKanji.set(kanji, recordMistake(byKanji.get(kanji), kanji, today))
  }

  for (const kanji of new Set(result.right)) {
    const prior = byKanji.get(kanji)
    // 沒在錯題本裡就答對 —— 本來就會，不需要排複習
    if (!prior) continue
    const next = recordCorrect(prior, today)
    if (next) byKanji.set(kanji, next)
    else byKanji.delete(kanji)
  }

  return [...byKanji.values()]
}
