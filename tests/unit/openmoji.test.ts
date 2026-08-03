import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import type { KanjiEntry } from '../../src/content/schema'

const raw = JSON.parse(readFileSync('content/source/openmoji-map.json', 'utf8')) as Record<
  string,
  string
>
const { _comment, ...map } = raw
const g1 = JSON.parse(readFileSync('content/kanji/1.json', 'utf8')) as KanjiEntry[]
const g2 = JSON.parse(readFileSync('content/kanji/2.json', 'utf8')) as KanjiEntry[]

/**
 * 覆蓋率門檻分年級。1 年級幾乎都是具象字（日月火水山川），2 年級開始大量
 * 抽象字（元・公・当・番・週），硬湊圖只會誤導孩子，所以門檻本來就該降。
 */
const MIN_COVERAGE = { 1: 0.7, 2: 0.35 } as const

describe('OpenMoji 意味插圖', () => {
  it('1 年級覆蓋率 ≥ 70%', () => {
    const hit = g1.filter((e) => e.openmoji).length
    expect(hit / g1.length).toBeGreaterThanOrEqual(MIN_COVERAGE[1])
  })

  it('2 年級覆蓋率 ≥ 35%（抽象字多，門檻本來就低）', () => {
    const hit = g2.filter((e) => e.openmoji).length
    expect(hit / g2.length).toBeGreaterThanOrEqual(MIN_COVERAGE[2])
  })

  it('背面 10 題所需的插圖字，兩個年級都足夠', () => {
    for (const [grade, list] of [[1, g1], [2, g2]] as const) {
      expect(list.filter((e) => e.openmoji).length, `${grade}年級`).toBeGreaterThanOrEqual(10)
    }
  })

  it('每個 hexcode 都對得到已複製的線稿檔', () => {
    for (const [kanji, code] of Object.entries(map)) {
      expect(existsSync(`public/openmoji/${code}.svg`), `${kanji} → ${code}`).toBe(true)
    }
  })

  it('沒有兩個字共用同一張圖（避免孩子混淆）', () => {
    const codes = Object.values(map)
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i)
    expect([...new Set(dupes)], '重複的 hexcode').toHaveLength(0)
  })

  it('對照表裡的字都在已建構的年級配当表內', () => {
    const chars = new Set([...g1, ...g2].map((e) => e.kanji))
    for (const kanji of Object.keys(map)) {
      expect(chars.has(kanji), `「${kanji}」不在 1–2 年級`).toBe(true)
    }
  })

  it('產出的 openmoji 欄位與對照表一致', () => {
    for (const e of [...g1, ...g2]) {
      expect(e.openmoji, e.kanji).toBe(map[e.kanji])
    }
  })

  it('線稿以描邊為主（實心色塊的檔案不超過 5 張）', () => {
    const solid = Object.entries(map).filter(([, code]) =>
      /fill="(?!none")[^"]+"/.test(readFileSync(`public/openmoji/${code}.svg`, 'utf8')),
    )
    // 頁面層的碳粉預算才是真正的關卡（tests/audit），這裡只擋住整批換成彩色版的意外
    expect(solid.map(([k]) => k), `含實心色塊：${solid.map(([k]) => k).join('')}`).toHaveLength(7)
  })

  it('viewBox 一律 72×72（版型靠這個等比縮放）', () => {
    for (const code of Object.values(map)) {
      const svg = readFileSync(`public/openmoji/${code}.svg`, 'utf8')
      expect(svg, code).toContain('viewBox="0 0 72 72"')
    }
  })
})
