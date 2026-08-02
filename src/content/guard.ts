/**
 * 配当表護欄。
 *
 * 這是整個 content-pipeline 的核心約束：任何素材（語彙、例句、短文）用到的漢字，
 * 都不得超出「該年級及以下」的配当表。一年級的孩子看到二年級的字，
 * 那張練習單就廢了 —— 他不會讀，也不知道自己該不該會。
 *
 * LLM 生成內容時尤其容易犯這個錯，所以檢查放在 build，違反就讓 build 失敗。
 */

/** 漢字（含日文擴充區），排除かな與標點 */
const KANJI_RE = /\p{Script=Han}/u

export interface Violation {
  kanji: string
  /** 這個字實際被配當到的年級；null = 完全不在小学配当表內 */
  requiredGrade: number | null
}

export interface GuardResult {
  ok: boolean
  violations: Violation[]
}

export interface KanjiGuard {
  check(text: string, grade: number): GuardResult
  gradeOf(kanji: string): number | null
}

/** @param table 年級 → 該年級的漢字清單 */
export function makeKanjiGuard(table: Record<number | string, string[]>): KanjiGuard {
  const grades = new Map<string, number>()
  for (const [g, list] of Object.entries(table)) {
    for (const ch of list) grades.set(ch, Number(g))
  }

  return {
    gradeOf: (kanji) => grades.get(kanji) ?? null,

    check(text, grade) {
      const violations: Violation[] = []
      const seen = new Set<string>()

      for (const ch of text) {
        if (!KANJI_RE.test(ch) || seen.has(ch)) continue
        seen.add(ch)
        const g = grades.get(ch) ?? null
        if (g === null || g > grade) violations.push({ kanji: ch, requiredGrade: g })
      }

      return { ok: violations.length === 0, violations }
    },
  }
}
