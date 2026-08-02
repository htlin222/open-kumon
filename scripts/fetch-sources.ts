/**
 * 下載並轉換外部資料來源到 data/raw/（不進 git）。
 *
 *   pnpm data:fetch
 *
 * 產出：
 *   data/raw/kyoiku-by-grade.json   現行学年別漢字配当表
 *   data/raw/kanji-details.json     每個字的音訓・画数（來源 kanjiapi.dev）
 *
 * 可重複執行；已抓過的字會跳過。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { ADDED_TO_G4, MOVED } from '../src/content/kyoiku-revision-2020.ts'

const RAW = 'data/raw'
const GRADES = [1, 2, 3, 4, 5, 6] as const
const THROTTLE_MS = 80

mkdirSync(RAW, { recursive: true })

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return (await res.json()) as T
}

/** kanjiapi.dev 的 grade 欄位來自 KANJIDIC2，是 1989 年的舊表 */
async function fetchOldTable(): Promise<Record<string, string[]>> {
  const table: Record<string, string[]> = {}
  for (const g of GRADES) {
    table[String(g)] = await getJson<string[]>(`https://kanjiapi.dev/v1/kanji/grade-${g}`)
    console.log(`  舊表 ${g}年: ${table[String(g)]!.length} 字`)
  }
  return table
}

function applyRevision(old: Record<string, string[]>): Record<string, string[]> {
  const next: Record<string, string[]> = Object.fromEntries(
    Object.entries(old).map(([g, list]) => [g, [...list]]),
  )

  for (const { kanji, from, to } of MOVED) {
    const src = next[String(from)]
    if (!src) throw new Error(`MOVED: 沒有 ${from} 年級`)
    const i = src.indexOf(kanji)
    if (i === -1) throw new Error(`MOVED: 「${kanji}」不在舊表的 ${from} 年級，patch 有誤`)
    src.splice(i, 1)
    next[String(to)]!.push(kanji)
  }

  const existing = new Set(Object.values(next).flat())
  for (const k of ADDED_TO_G4) {
    if (existing.has(k)) throw new Error(`ADDED_TO_G4:「${k}」已在配当表中，patch 有誤`)
    next['4']!.push(k)
  }

  return next
}

/** 逐字取音訓與画数。835+ 字，加節流避免打爆對方 */
async function fetchDetails(chars: string[]): Promise<void> {
  const path = `${RAW}/kanji-details.json`
  const cache: Record<string, unknown> = existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>)
    : {}

  const todo = chars.filter((c) => !cache[c])
  console.log(`  詳細資料：已有 ${chars.length - todo.length} 字，待抓 ${todo.length} 字`)

  let done = 0
  for (const ch of todo) {
    cache[ch] = await getJson(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`)
    if (++done % 50 === 0) {
      console.log(`    ${done}/${todo.length}`)
      writeFileSync(path, JSON.stringify(cache, null, 2))
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }
  writeFileSync(path, JSON.stringify(cache, null, 2))
  console.log(`✓ ${path} (${Object.keys(cache).length} 字)`)
}

console.log('取得舊表…')
const revised = applyRevision(await fetchOldTable())
for (const g of GRADES) console.log(`  現行 ${g}年: ${revised[String(g)]!.length} 字`)
writeFileSync(`${RAW}/kyoiku-by-grade.json`, JSON.stringify(revised, null, 2))
console.log(`✓ ${RAW}/kyoiku-by-grade.json`)

console.log('取得音訓・画数…')
const targets = [1, 2, 3, 4, 5].flatMap((g) => revised[String(g)]!)
await fetchDetails(targets)
