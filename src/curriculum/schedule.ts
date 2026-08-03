import { dueOn, type MistakeRecord } from './srs'
import { isConsecutive, daysBetween, type DayKey } from './day'

/**
 * 每日課表選擇。
 *
 * 兩股力量在拉：往前推進主線，往回收拾錯題。
 * 平常複習是「偷渡」在正課裡的（每回混入最多 3 個到期字），孩子不會察覺自己在複習；
 * 只有到期字積到 8 個以上，才會出現一整張複習卷。
 *
 * 純函式：今天的日期由外部傳入。同樣的輸入永遠得到同樣的輸出 ——
 * 這保證孩子多開一個分頁不會拿到不同的「今天這張」。
 */

/** 到期字達到這個數量就出整張複習卷 */
export const REVIEW_THRESHOLD = 8

/** 正課裡最多混入幾個到期字 */
export const MAX_INJECTED = 3

export type Assignment =
  | { kind: 'review'; kanji: string[] }
  | { kind: 'lesson'; unitNo: number; injected: string[] }
  /** 書き方：不推進主線，專練最近學過的字的字形與筆順 */
  | { kind: 'writing'; kanji: string[] }
  | { kind: 'finished' }

/** 每做完幾回正課插一張書き方 */
export const WRITING_EVERY = 5

/** 一張書き方練幾個字 */
export const WRITING_SLOTS = 8

export interface ScheduleInput {
  /** 主線下一回的編號（1-based） */
  nextUnitNo: number
  totalUnits: number
  mistakes: readonly MistakeRecord[]
  today: DayKey
  /** 已完成的正課回數，用來決定何時插書き方 */
  lessonsDone?: number
  /** 今天是否已經做過書き方（避免同一天重複出） */
  writingDoneToday?: boolean
  /** 最近學過的字，由呼叫端提供 */
  recentKanji?: readonly string[]
}

export function pickAssignment({
  nextUnitNo,
  totalUnits,
  mistakes,
  today,
  lessonsDone,
  writingDoneToday,
  recentKanji,
}: ScheduleInput): Assignment {
  const ready = dueOn(mistakes, today)
  const mainLineDone = nextUnitNo > totalUnits

  if (ready.length >= REVIEW_THRESHOLD || (mainLineDone && ready.length > 0)) {
    return { kind: 'review', kanji: ready.map((r) => r.kanji) }
  }

  // 每 WRITING_EVERY 回正課之後插一張書き方。它不推進主線 ——
  // 練的是字形與筆順，不是新字，所以不該吃掉主線的進度。
  const due = (lessonsDone ?? 0) > 0 && (lessonsDone ?? 0) % WRITING_EVERY === 0
  if (due && !writingDoneToday && (recentKanji?.length ?? 0) > 0) {
    return { kind: 'writing', kanji: recentKanji!.slice(-WRITING_SLOTS) }
  }

  if (mainLineDone) return { kind: 'finished' }

  return {
    kind: 'lesson',
    unitNo: nextUnitNo,
    injected: ready.slice(0, MAX_INJECTED).map((r) => r.kanji),
  }
}

/**
 * 連續天數。
 *
 * 今天還沒寫不算斷 —— 昨天有寫就還活著。否則孩子早上打開網站
 * 會看到連續天數歸零，那是在懲罰他還沒開始。
 */
export function streakOf(completedDays: readonly DayKey[], today: DayKey): number {
  const days = [...new Set(completedDays)].sort().reverse()
  const latest = days[0]
  if (!latest || !isConsecutive(latest, today)) return 0

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i]!, days[i - 1]!) !== 1) break
    streak++
  }
  return streak
}
