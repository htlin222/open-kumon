import type { Probe } from './probes'

/**
 * 程度檢定：規則式自適應快篩。
 *
 * 判定完全不經 LLM —— 這是孩子對系統的第一印象，一個小模型把「はな」判成錯的
 * 就毀了。Workers AI 只負責把結果寫成一段給家長看的中文說明，那是文字工作，
 * 錯了也不影響定位。
 *
 * 三段：
 *   1. かな（6 題）── 決定要不要從 ひらがな・カタカナ 開始
 *   2. 漢字（每輪 2 題，二分搜尋 1–5 年級）── 定位年級
 *   3. 助詞（4 題）── 決定「言葉と文のきまり」能不能解鎖
 *
 * 全程約 16 題，3–5 分鐘。
 */

/** かな 這一段的及格線：低於此就從假名開始 */
export const KANA_PASS = 4
/** 漢字每輪 2 題，答對幾題算通過該年級 */
export const KANJI_PASS = 1
/** 助詞這一段的及格線 */
export const GRAMMAR_PASS = 3

export interface PlacementResult {
  /** 建議起始年級；0 = 先做假名 */
  startGrade: number
  needsKana: boolean
  grammarReady: boolean
  kanaScore: number
  kanaTotal: number
  grammarScore: number
  grammarTotal: number
  /** 各年級的漢字答題結果，用來寫說明 */
  kanjiRounds: { grade: number; correct: number; total: number }[]
}

export type Phase =
  | { stage: 'kana' }
  | { stage: 'kanji'; lo: number; hi: number; probing: number }
  | { stage: 'grammar' }
  | { stage: 'done'; result: PlacementResult }

export interface PlacementState {
  phase: Phase
  /** 目前這一段還沒答的題 */
  queue: Probe[]
  /** 目前這一段已答對幾題 */
  correct: number
  answered: number
  kanaScore: number
  grammarScore: number
  kanaTotal: number
  grammarTotal: number
  kanjiRounds: { grade: number; correct: number; total: number }[]
  /** 已答題數／預估總題數，給進度條用 */
  progress: { done: number; estimate: number }
}

export interface ProbeSource {
  kana: (count: number) => Probe[]
  kanji: (grade: number, count: number) => Probe[]
  grammar: Probe[]
}

const KANA_COUNT = 6
const KANJI_PER_ROUND = 2
/** かな6 + 漢字最多3輪×2 + 助詞4 */
const ESTIMATE = KANA_COUNT + 3 * KANJI_PER_ROUND + 4

export function startPlacement(src: ProbeSource): PlacementState {
  return {
    phase: { stage: 'kana' },
    queue: src.kana(KANA_COUNT),
    correct: 0,
    answered: 0,
    kanaScore: 0,
    grammarScore: 0,
    kanaTotal: KANA_COUNT,
    grammarTotal: src.grammar.length,
    kanjiRounds: [],
    progress: { done: 0, estimate: ESTIMATE },
  }
}

function finish(s: PlacementState, startGrade: number): PlacementState {
  return {
    ...s,
    phase: {
      stage: 'done',
      result: {
        startGrade,
        needsKana: startGrade === 0,
        grammarReady: s.grammarScore >= GRAMMAR_PASS,
        kanaScore: s.kanaScore,
        kanaTotal: s.kanaTotal,
        grammarScore: s.grammarScore,
        grammarTotal: s.grammarTotal,
        kanjiRounds: s.kanjiRounds,
      },
    },
    queue: [],
  }
}

/**
 * 回答目前這一題，回傳下一個狀態。
 *
 * 純函式：不碰時間、不碰亂數、不碰儲存。
 */
export function answer(s: PlacementState, choice: string, src: ProbeSource): PlacementState {
  const probe = s.queue[0]
  if (!probe || s.phase.stage === 'done') return s

  const hit = choice === probe.answer
  const rest = s.queue.slice(1)
  const correct = s.correct + (hit ? 1 : 0)
  const answered = s.answered + 1
  const progress = { ...s.progress, done: s.progress.done + 1 }
  const next = { ...s, queue: rest, correct, answered, progress }

  if (rest.length > 0) return next

  // 這一段答完了，決定下一段
  if (s.phase.stage === 'kana') {
    const kanaScore = correct
    if (kanaScore < KANA_PASS) {
      // 假名還不穩，不必再往下測漢字 —— 起點就是假名
      return finish({ ...next, kanaScore }, 0)
    }
    const lo = 1
    const hi = 5
    const mid = Math.ceil((lo + hi) / 2)
    return {
      ...next,
      kanaScore,
      correct: 0,
      phase: { stage: 'kanji', lo, hi, probing: mid },
      queue: src.kanji(mid, KANJI_PER_ROUND),
    }
  }

  if (s.phase.stage === 'kanji') {
    const { lo, hi, probing } = s.phase
    const passed = correct >= KANJI_PASS
    const rounds = [...s.kanjiRounds, { grade: probing, correct, total: KANJI_PER_ROUND }]
    const nextLo = passed ? probing + 1 : lo
    const nextHi = passed ? hi : probing - 1

    if (nextLo > nextHi) {
      // 二分結束：nextLo 就是「還沒證明會」的第一個年級
      return {
        ...next,
        kanjiRounds: rounds,
        correct: 0,
        phase: { stage: 'grammar' },
        queue: src.grammar,
        progress: { ...progress, estimate: progress.done + src.grammar.length },
      }
    }

    const mid = Math.ceil((nextLo + nextHi) / 2)
    return {
      ...next,
      kanjiRounds: rounds,
      correct: 0,
      phase: { stage: 'kanji', lo: nextLo, hi: nextHi, probing: mid },
      queue: src.kanji(mid, KANJI_PER_ROUND),
    }
  }

  // grammar
  const grammarScore = correct
  const startGrade = gradeFrom(s.kanjiRounds)
  return finish({ ...next, grammarScore }, startGrade)
}

/**
 * 從各輪結果算出起始年級：最低的「沒通過」年級。
 * 全部通過就從 5 年級開始（本專案上限）。
 */
export function gradeFrom(rounds: { grade: number; correct: number }[]): number {
  const failed = rounds.filter((r) => r.correct < KANJI_PASS).map((r) => r.grade)
  if (failed.length === 0) return 5
  return Math.min(...failed)
}

export function currentProbe(s: PlacementState): Probe | null {
  return s.queue[0] ?? null
}
