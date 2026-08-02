/**
 * 從 KanjiVG 的 SVG 抽出筆順資料。
 *
 *   pnpm content:strokes
 *
 * 只保留 path 的 d 字串與編號座標，不存整份 SVG —— 體積差約 10 倍，
 * 且渲染時本來就要自己控制 stroke 顏色粗細（なぞり用淡灰、範字用黑）。
 *
 * 來源：https://kanjivg.tagaini.net  CC BY-SA 3.0
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { TARGET_GRADES, kanjivgIdOf, type KanjiEntry } from '../src/content/schema.ts'
import type { StrokeData } from '../src/content/strokes.ts'

const SRC = 'data/raw/kanji'

/** `<path id="kvg:082b1-s3" ... d="M71.25,..."/>` → 筆序 + d */
const PATH_RE = /<path[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"/g
/** `<text transform="matrix(1 0 0 1 62.50 12.50)">3</text>` → 座標 + 編號 */
const NUMBER_RE = /<text transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)">(\d+)<\/text>/g
const VIEWBOX_RE = /<svg[^>]*viewBox="([^"]+)"/

function parse(svg: string, ch: string): StrokeData {
  const viewBox = VIEWBOX_RE.exec(svg)?.[1]
  if (!viewBox) throw new Error(`${ch}: 找不到 viewBox`)

  const strokes: { order: number; d: string }[] = []
  for (const m of svg.matchAll(PATH_RE)) {
    strokes.push({ order: Number(m[1]), d: m[2]! })
  }
  if (strokes.length === 0) throw new Error(`${ch}: 沒有抽到任何筆畫`)
  // 檔案裡的 path 是按部件分組排列的，順序不保證等於筆順 —— 依 sN 明確排序
  strokes.sort((a, b) => a.order - b.order)

  const numbered: { order: number; xy: [number, number] }[] = []
  for (const m of svg.matchAll(NUMBER_RE)) {
    numbered.push({ order: Number(m[3]), xy: [Number(m[1]), Number(m[2])] })
  }
  numbered.sort((a, b) => a.order - b.order)

  return { viewBox, paths: strokes.map((s) => s.d), numbers: numbered.map((n) => n.xy) }
}

mkdirSync('content/strokes', { recursive: true })

for (const grade of TARGET_GRADES) {
  const path = `content/kanji/${grade}.json`
  if (!existsSync(path)) {
    console.log(`- ${grade}年: 跳過（${path} 尚未建構）`)
    continue
  }

  const entries = JSON.parse(readFileSync(path, 'utf8')) as KanjiEntry[]
  const out: Record<string, StrokeData> = {}

  for (const e of entries) {
    const svgPath = `${SRC}/${kanjivgIdOf(e.kanji)}.svg`
    if (!existsSync(svgPath)) throw new Error(`缺少 ${svgPath}（${e.kanji}）`)
    out[e.kanji] = parse(readFileSync(svgPath, 'utf8'), e.kanji)
  }

  const dest = `content/strokes/${grade}.json`
  writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`✓ ${dest} (${Object.keys(out).length} 字)`)
}
