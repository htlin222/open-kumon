import type { KanjiEntry } from '../content/schema'

/**
 * 課程排序的兩條軸。
 *
 * 【学年軸】照 学年別漢字配当表 走 —— 跟日本學校同步，孩子將來要讀日本教材、
 *   或跟同齡人比較時有對應點。
 *
 * 【JLPT軸】照 N5 → N1 走 —— 目標是考試。兩者順序差很多：
 *   `曜・時・分・半・円・駅` 是 N5 必考，但配当表把它們散在 1–3 年級；
 *   反過來 `貝・糸・玉` 在 1 年級就教，JLPT 幾乎用不到。
 *
 * 同一批內容，換一個排序函式而已 —— 不需要兩套教材。
 */

export type TrackAxis = 'grade' | 'jlpt'

export const JLPT_LEVELS = [5, 4, 3, 2, 1] as const
export type JlptLevel = (typeof JLPT_LEVELS)[number]

export const jlptName = (level: number): string => `N${level}`

/**
 * 依 JLPT 等級重排。
 *
 * 同一級之內仍照配当表順序 —— 那個順序本身是有道理的（先教筆畫少、
 * 部件單純、日常高頻的字），沒有理由打散。
 *
 * 沒有 JLPT 等級的字（13/835）排在最後：它們不在任何級別的考試範圍內，
 * 但仍屬小學必學，所以不能丟掉。
 */
export function byJlpt(entries: readonly KanjiEntry[]): KanjiEntry[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const la = a.e.jlpt ?? 0 // null 視為最低優先
      const lb = b.e.jlpt ?? 0
      if (la !== lb) return lb - la // 5(N5) 先於 1(N1)
      return a.i - b.i // 同級維持原順序
    })
    .map((x) => x.e)
}

/** 依軸線取出完整的字序 */
export function orderFor(axis: TrackAxis, entries: readonly KanjiEntry[]): KanjiEntry[] {
  return axis === 'jlpt' ? byJlpt(entries) : [...entries]
}

export interface LevelSummary {
  level: JlptLevel | null
  count: number
  learned: number
}

/** 某個學習進度下，各 JLPT 級別學了幾個字 —— 給「離 N5 還有多遠」用 */
export function jlptProgress(
  all: readonly KanjiEntry[],
  learnedChars: ReadonlySet<string>,
): LevelSummary[] {
  const out: LevelSummary[] = []
  for (const level of JLPT_LEVELS) {
    const inLevel = all.filter((e) => e.jlpt === level)
    out.push({
      level,
      count: inLevel.length,
      learned: inLevel.filter((e) => learnedChars.has(e.kanji)).length,
    })
  }
  const none = all.filter((e) => e.jlpt === null)
  if (none.length > 0) {
    out.push({
      level: null,
      count: none.length,
      learned: none.filter((e) => learnedChars.has(e.kanji)).length,
    })
  }
  return out
}

/**
 * JLPT 各級所需的常用漢字總數（官方沒有公布正式字表，這是通行的估計值）。
 *
 * 這組數字存在的理由是提醒一件事：**小學六年只教 1026 字，而 N1 需要約 2136 字**。
 * 也就是說，課程只要綁在配当表上，天花板大約就是 N2。要走到 N1，
 * 到某個時點必須跨出小學範圍、開始教中學漢字（另外約 1110 字）。
 *
 * 目標既然設在「小六 N1」，這個轉折點就得排進課程，不能等撞牆才發現。
 */
export const JLPT_KANJI_TARGET: Record<JlptLevel, number> = {
  5: 100,
  4: 300,
  3: 650,
  2: 1000,
  1: 2136,
}

/** 小學六年的漢字總數（学年別漢字配当表・令和2年度） */
export const ELEMENTARY_TOTAL = 1026
