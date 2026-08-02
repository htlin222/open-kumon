import { describe, it, expect } from 'vitest'
import { toDayKey, addDays, daysBetween, isConsecutive, isOnOrBefore } from '../../src/curriculum/day'

describe('日期工具', () => {
  it('把 Date 轉成本地日期字串', () => {
    expect(toDayKey(new Date(2026, 7, 3, 12, 0))).toBe('2026-08-03')
  })

  it('用本地時間而非 UTC —— 深夜不該跳到隔天', () => {
    // 台灣 UTC+8：8/3 23:00 的 toISOString() 是 8/3 15:00Z，看似安全；
    // 但 8/3 08:00 的 UTC 是 8/3 00:00Z，而 8/2 23:00 的 UTC 已是 8/2 15:00Z。
    // 真正會出事的是 UTC 負時區，這裡固定驗「本地日期欄位」而非時間戳。
    expect(toDayKey(new Date(2026, 7, 3, 23, 59, 59))).toBe('2026-08-03')
    expect(toDayKey(new Date(2026, 7, 4, 0, 0, 1))).toBe('2026-08-04')
  })

  it('個位數月份與日期補零', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('addDays 跨月正確', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
  })

  it('addDays 跨年正確', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('addDays 處理閏年', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('addDays 可以往回', () => {
    expect(addDays('2026-09-02', -3)).toBe('2026-08-30')
  })

  it('daysBetween 計算天數差', () => {
    expect(daysBetween('2026-08-01', '2026-08-04')).toBe(3)
    expect(daysBetween('2026-08-04', '2026-08-01')).toBe(-3)
    expect(daysBetween('2026-08-01', '2026-08-01')).toBe(0)
  })

  it('daysBetween 跨月不受月長影響', () => {
    expect(daysBetween('2026-01-31', '2026-03-01')).toBe(29)
  })

  it('isConsecutive：今天或昨天都算連續存活', () => {
    expect(isConsecutive('2026-08-03', '2026-08-03')).toBe(true)
    expect(isConsecutive('2026-08-02', '2026-08-03')).toBe(true)
    expect(isConsecutive('2026-08-01', '2026-08-03')).toBe(false)
  })

  it('isOnOrBefore 判斷是否已到期', () => {
    expect(isOnOrBefore('2026-08-02', '2026-08-03')).toBe(true)
    expect(isOnOrBefore('2026-08-03', '2026-08-03')).toBe(true)
    expect(isOnOrBefore('2026-08-04', '2026-08-03')).toBe(false)
  })
})
