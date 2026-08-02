/**
 * 把用得到的 OpenMoji 線稿複製到 public/openmoji/，並把 hexcode 併回 content/kanji/*.json。
 *
 *   pnpm content:illustrations
 *
 * 只複製有對應到的字，不整包 4000+ 張搬進來。
 * 來源：https://openmoji.org  CC BY-SA 4.0
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { TARGET_GRADES, type KanjiEntry } from '../src/content/schema.ts'

const SRC = 'node_modules/openmoji/black/svg'
const DEST = 'public/openmoji'

const map = JSON.parse(readFileSync('content/source/openmoji-map.json', 'utf8')) as Record<
  string,
  string
>
delete map._comment

mkdirSync(DEST, { recursive: true })

const copied = new Set<string>()
const withSolidFill: string[] = []

for (const [kanji, code] of Object.entries(map)) {
  const src = `${SRC}/${code}.svg`
  if (!existsSync(src)) throw new Error(`OpenMoji 缺少 ${code}.svg（對應「${kanji}」）`)

  const svg = readFileSync(src, 'utf8')
  // OpenMoji 的 black 版多半是純描邊，但不是全部 —— 例如 1F441（目）的瞳孔是實心黑。
  // 這裡只記錄不阻擋：真正的約束是「整頁碳粉覆蓋率 ≤ 8%」，那個在 Playwright
  // 稽核（tests/audit）量測。一個 14mm 圖示裡的小色塊不該讓 build 失敗。
  if (/fill="(?!none")[^"]+"/.test(svg)) withSolidFill.push(`${kanji}(${code})`)

  copyFileSync(src, `${DEST}/${code}.svg`)
  copied.add(code)
}

console.log(`✓ ${DEST}/ (${copied.size} 張線稿)`)
if (withSolidFill.length > 0) {
  console.log(`  含實心色塊 ${withSolidFill.length} 張：${withSolidFill.join(' ')}`)
  console.log('  （不阻擋；碳粉預算由 pnpm audit:sheets 在頁面層把關）')
}

for (const grade of TARGET_GRADES) {
  const path = `content/kanji/${grade}.json`
  if (!existsSync(path)) continue

  const entries = JSON.parse(readFileSync(path, 'utf8')) as KanjiEntry[]
  let hit = 0
  for (const e of entries) {
    const code = map[e.kanji]
    if (code) {
      e.openmoji = code
      hit++
    } else {
      delete e.openmoji
    }
  }
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`)
  const pct = ((hit / entries.length) * 100).toFixed(1)
  console.log(`✓ ${path}: ${hit}/${entries.length} 字有插圖 (${pct}%)`)
}
