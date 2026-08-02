/**
 * 日期工具。
 *
 * 整套課表引擎一律用「本地日期字串」（YYYY-MM-DD）而不是時間戳。
 * 理由很實際：孩子晚上九點寫完那張紙，那是「今天」的紀錄；
 * 用 UTC 時間戳算，在 UTC-x 時區會提早跳日、日光節約時間切換時會多出或少掉一小時。
 * 「今天該練哪張」不該受這些影響。
 */

export type DayKey = string // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → 本地日期字串。刻意不用 toISOString()（那是 UTC）。 */
export function toDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** 加減天數。交給 Date 處理跨月、跨年、閏年。 */
export function addDays(key: DayKey, delta: number): DayKey {
  const d = parse(key)
  d.setDate(d.getDate() + delta)
  return toDayKey(d)
}

/** to - from，單位是天 */
export function daysBetween(from: DayKey, to: DayKey): number {
  const ms = parse(to).getTime() - parse(from).getTime()
  // 用四捨五入吸收日光節約時間造成的 ±1 小時
  return Math.round(ms / 86_400_000)
}

/** 連續天數是否還活著：最後一次完成是今天或昨天 */
export function isConsecutive(last: DayKey, today: DayKey): boolean {
  const gap = daysBetween(last, today)
  return gap === 0 || gap === 1
}

/** 到期判斷 */
export function isOnOrBefore(key: DayKey, today: DayKey): boolean {
  return daysBetween(key, today) >= 0
}
