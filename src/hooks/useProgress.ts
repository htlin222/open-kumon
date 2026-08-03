import { useCallback, useMemo, useState } from 'react'
import {
  loadStore,
  saveStore,
  addChild,
  activeChild,
  recordCompletion,
  setActiveChild,
  promoteGrade,
} from '../storage/store'
import type { Completion, Store } from '../storage/schema'
import { pickAssignment, streakOf, type Assignment } from '../curriculum/schedule'
import { dueOn } from '../curriculum/srs'
import { toDayKey, type DayKey } from '../curriculum/day'
import { buildUnit, buildReviewUnit, checkableOf, unitCount, type KanjiUnit } from '../curriculum/units'
import { KANJI_BY_GRADE, earlierGrades } from '../content/registry'

export interface ProgressView {
  store: Store
  childName: string | null
  today: DayKey
  streak: number
  /** 今天的作業；沒有孩子或該年級沒內容時為 null */
  assignment: Assignment | null
  /** 依作業組出來的練習單內容 */
  unit: KanjiUnit | null
  /** 這一回會被檢查的字（勾錯題時列出來的） */
  checkable: string[]
  dueCount: number
  totalUnits: number
  createChild: (name: string) => void
  chooseChild: (id: string) => void
  submit: (wrong: string[]) => void
  /** 今天是否已經送出過 */
  doneToday: boolean
  grade: number
  /** 下一個有內容的年級；沒有就是 null */
  nextGrade: number | null
  promote: () => void
}

/**
 * 把儲存層與課表引擎接到 React。
 *
 * 今天的日期只在這裡讀一次，往下都是傳值 —— 引擎本身是純函式，
 * 這樣才測得動，也才保證同一天算出來的作業穩定。
 */
export function useProgress(): ProgressView {
  const [store, setStore] = useState<Store>(() => loadStore())
  const today = useMemo(() => toDayKey(new Date()), [])

  const update = useCallback((next: Store) => {
    saveStore(next)
    setStore(next)
  }, [])

  const child = activeChild(store)
  const entries = child ? KANJI_BY_GRADE[child.grade] : undefined
  const totalUnits = entries ? unitCount(entries) : 0

  const assignment = useMemo<Assignment | null>(() => {
    if (!child || !entries) return null
    return pickAssignment({
      nextUnitNo: child.nextUnitNo,
      totalUnits,
      mistakes: child.mistakes,
      today,
    })
  }, [child, entries, totalUnits, today])

  const unit = useMemo<KanjiUnit | null>(() => {
    if (!child || !entries || !assignment) return null
    if (assignment.kind === 'review') {
      return buildReviewUnit(entries, child.grade, assignment.kanji)
    }
    if (assignment.kind === 'lesson') {
      return buildUnit(entries, child.grade, assignment.unitNo, assignment.injected, earlierGrades(child.grade))
    }
    return null
  }, [child, entries, assignment])

  // 清單由紙面反推，不由課表反推 —— 沒印在紙上的字不該被問對錯
  const checkable = useMemo(() => {
    if (!unit || !assignment) return []
    if (assignment.kind === 'lesson') return checkableOf(unit, assignment.injected)
    if (assignment.kind === 'review') return unit.newKanji.map((e) => e.kanji)
    return []
  }, [unit, assignment])

  const doneToday = Boolean(
    child?.completions.some(
      (c) =>
        c.day === today &&
        c.kind === (assignment?.kind === 'review' ? 'review' : 'lesson') &&
        c.unitNo === (assignment?.kind === 'lesson' ? assignment.unitNo : null),
    ),
  )

  const submit = useCallback(
    (wrong: string[]) => {
      if (!child || !assignment || assignment.kind === 'finished') return
      const entry: Completion = {
        day: today,
        kind: assignment.kind,
        unitNo: assignment.kind === 'lesson' ? assignment.unitNo : null,
        wrong,
        right: checkable.filter((k) => !wrong.includes(k)),
      }
      update(recordCompletion(store, child.id, entry))
    },
    [child, assignment, checkable, store, today, update],
  )

  return {
    store,
    childName: child?.name ?? null,
    today,
    streak: streakOf(child?.completions.map((c) => c.day) ?? [], today),
    assignment,
    unit,
    checkable,
    dueCount: child ? dueOn(child.mistakes, today).length : 0,
    totalUnits,
    createChild: (name) => update(addChild(store, name, today)),
    chooseChild: (id) => update(setActiveChild(store, id)),
    submit,
    doneToday,
    grade: child?.grade ?? 1,
    nextGrade:
      child && KANJI_BY_GRADE[child.grade + 1] ? child.grade + 1 : null,
    promote: () => child && update(promoteGrade(store, child.id)),
  }
}
