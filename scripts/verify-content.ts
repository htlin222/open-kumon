/**
 * 掃過 content/ 全部素材，確認沒有超綱漢字、沒有 schema 違規。
 *
 *   pnpm content:verify
 *
 * 這支在 CI 跑。任何一項不合就 exit 1 —— 寧可 build 紅，也不要印出孩子讀不懂的紙。
 */
import { readFileSync, existsSync } from 'node:fs'
import { KanjiEntrySchema, GRADE_KANJI_COUNTS, TARGET_GRADES, type KanjiEntry } from '../src/content/schema.ts'
import { makeKanjiGuard } from '../src/content/guard.ts'

const table = JSON.parse(readFileSync('data/raw/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>
const guard = makeKanjiGuard(table)

const problems: string[] = []
let checkedGrades = 0
let checkedTexts = 0

for (const grade of TARGET_GRADES) {
  const kanjiPath = `content/kanji/${grade}.json`
  if (!existsSync(kanjiPath)) continue
  checkedGrades++

  const entries = JSON.parse(readFileSync(kanjiPath, 'utf8')) as KanjiEntry[]

  if (entries.length !== GRADE_KANJI_COUNTS[grade]) {
    problems.push(`${kanjiPath}: ${entries.length} 字，應為 ${GRADE_KANJI_COUNTS[grade]}`)
  }

  for (const e of entries) {
    const r = KanjiEntrySchema.safeParse(e)
    if (!r.success) problems.push(`${kanjiPath} 「${e.kanji}」: ${r.error.issues[0]?.message}`)
    if (guard.gradeOf(e.kanji) !== grade) {
      problems.push(`${kanjiPath} 「${e.kanji}」: 配当表說是 ${guard.gradeOf(e.kanji)} 年級`)
    }
  }

  // 日文素材（語彙・例句・短文）：每一段文字都不得超綱
  for (const kind of ['words', 'sentences', 'passages', 'grammar'] as const) {
    const p = `content/${kind}/${grade}.json`
    if (!existsSync(p)) continue

    const items = JSON.parse(readFileSync(p, 'utf8')) as { ja?: string; text?: string }[]
    for (const [i, item] of items.entries()) {
      const ja = item.ja ?? item.text
      if (!ja) continue
      checkedTexts++
      const r = guard.check(ja, grade)
      if (!r.ok) {
        const detail = r.violations
          .map((v) => `${v.kanji}(${v.requiredGrade ?? '非小学'})`)
          .join(' ')
        problems.push(`${p}[${i}] 「${ja}」超綱：${detail}`)
      }
    }
  }
}

console.log(`檢查了 ${checkedGrades} 個年級的漢字表、${checkedTexts} 段日文素材`)

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} 個問題：`)
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`)
  if (problems.length > 50) console.error(`  …還有 ${problems.length - 50} 個`)
  process.exit(1)
}

console.log('✓ 全部通過')
