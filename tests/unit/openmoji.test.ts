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
const g3 = JSON.parse(readFileSync('content/kanji/3.json', 'utf8')) as KanjiEntry[]

/**
 * 覆蓋率門檻分年級。1 年級幾乎都是具象字（日月火水山川），2 年級開始大量
 * 抽象字（元・公・当・番・週），硬湊圖只會誤導孩子，所以門檻本來就該降。
 */
const MIN_COVERAGE = { 1: 0.7, 2: 0.35, 3: 0.3 } as const

describe('OpenMoji 意味插圖', () => {
  it('1 年級覆蓋率 ≥ 70%', () => {
    const hit = g1.filter((e) => e.openmoji).length
    expect(hit / g1.length).toBeGreaterThanOrEqual(MIN_COVERAGE[1])
  })

  it('2 年級覆蓋率 ≥ 35%（抽象字多，門檻本來就低）', () => {
    const hit = g2.filter((e) => e.openmoji).length
    expect(hit / g2.length).toBeGreaterThanOrEqual(MIN_COVERAGE[2])
  })

  it('3 年級覆蓋率 ≥ 30%', () => {
    const hit = g3.filter((e) => e.openmoji).length
    expect(hit / g3.length).toBeGreaterThanOrEqual(MIN_COVERAGE[3])
  })

  it('背面 10 題所需的插圖字，每個年級都足夠', () => {
    for (const [grade, list] of [[1, g1], [2, g2], [3, g3]] as const) {
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
    const chars = new Set([...g1, ...g2, ...g3].map((e) => e.kanji))
    for (const kanji of Object.keys(map)) {
      expect(chars.has(kanji), `「${kanji}」不在 1–3 年級`).toBe(true)
    }
  })

  it('產出的 openmoji 欄位與對照表一致', () => {
    for (const e of [...g1, ...g2, ...g3]) {
      expect(e.openmoji, e.kanji).toBe(map[e.kanji])
    }
  })

  it('線稿以描邊為主（含實心色塊者不超過一成）', () => {
    const solid = Object.entries(map).filter(([, code]) =>
      /fill="(?!none")[^"]+"/.test(readFileSync(`public/openmoji/${code}.svg`, 'utf8')),
    )
    // 用比例而非固定張數 —— 這個檢查的目的是擋住「整批換成彩色版」的意外，
    // 不是數個數。寫死數字的話每加一個年級就要改一次，那不是在驗證什麼。
    // 真正的碳粉關卡在頁面層（tests/audit）。
    const ratio = solid.length / Object.keys(map).length
    expect(ratio, `含實心色塊 ${solid.length}/${Object.keys(map).length}：${solid.map(([k]) => k).join('')}`).toBeLessThanOrEqual(0.1)
  })

  it('viewBox 一律 72×72（版型靠這個等比縮放）', () => {
    for (const code of Object.values(map)) {
      const svg = readFileSync(`public/openmoji/${code}.svg`, 'utf8')
      expect(svg, code).toContain('viewBox="0 0 72 72"')
    }
  })
})
