/**
 * 把 data/raw/ 的原始資料轉成 content/ 下可校對、可進 git 的 JSON。
 *
 *   pnpm content:build
 *
 * 只建構「中文釋義已備齊」的年級；其餘年級會列出還缺哪些字後跳過。
 * 這樣 pipeline 不會因為釋義還沒寫完就整個卡住。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { KanjiEntrySchema, TARGET_GRADES, kanjivgIdOf, type KanjiEntry } from '../src/content/schema.ts'

interface KanjiApiEntry {
  stroke_count: number
  on_readings?: string[]
  kun_readings?: string[]
}

const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>
const details = JSON.parse(readFileSync('data/raw/kanji-details.json', 'utf8')) as Record<
  string,
  KanjiApiEntry
>
const zh = JSON.parse(readFileSync('content/source/meanings-zh.json', 'utf8')) as Record<
  string,
  string
>

mkdirSync('content/kanji', { recursive: true })

let built = 0
for (const grade of TARGET_GRADES) {
  const chars = table[String(grade)]
  if (!chars) throw new Error(`配当表缺少 ${grade} 年級`)

  const missingZh = chars.filter((ch) => !zh[ch]?.trim())
  if (missingZh.length > 0) {
    console.log(
      `- ${grade}年: 跳過，還缺 ${missingZh.length} 字的中文釋義：${missingZh.slice(0, 20).join('')}${missingZh.length > 20 ? '…' : ''}`,
    )
    continue
  }

  const entries: KanjiEntry[] = chars.map((ch) => {
    const d = details[ch]
    if (!d) throw new Error(`缺少「${ch}」的音訓資料，請重跑 pnpm data:fetch`)
    return KanjiEntrySchema.parse({
      kanji: ch,
      // grade 一律以配当表為準。kanjiapi 回的 grade 是 1989 舊表，不可信。
      grade,
      strokes: d.stroke_count,
      on: d.on_readings ?? [],
      kun: d.kun_readings ?? [],
      meaningZh: zh[ch]!,
      kanjivgId: kanjivgIdOf(ch),
    })
  })

  const path = `content/kanji/${grade}.json`
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`)
  console.log(`✓ ${path} (${entries.length} 字)`)
  built++
}

if (built === 0) throw new Error('沒有任何年級被建構 — 先補齊 content/source/meanings-zh.json')
