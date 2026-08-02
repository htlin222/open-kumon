import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const zh = JSON.parse(readFileSync('content/source/meanings-zh.json', 'utf8')) as Record<
  string,
  string
>
const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>

/** 中文母語者最容易直接套用中文本義而讀錯的字 */
const FALSE_FRIENDS: Record<string, RegExp> = {
  赤: /紅/,
  青: /藍/,
  本: /書/,
  円: /日圓|圓/,
  糸: /線/,
}

describe('zh-TW 釋義', () => {
  const g1 = table['1']!

  it('1 年級 80 字全部有釋義', () => {
    const missing = g1.filter((k) => !zh[k]?.trim())
    expect(missing, `缺：${missing.join('')}`).toHaveLength(0)
  })

  it('每則釋義不超過 12 字', () => {
    for (const k of g1) expect(zh[k]!.length, `${k}: ${zh[k]}`).toBeLessThanOrEqual(12)
  })

  it('日中同形異義字標的是日文語境的意思', () => {
    for (const [k, expected] of Object.entries(FALSE_FRIENDS)) {
      expect(zh[k], `${k} 的釋義是「${zh[k]}」`).toMatch(expected)
    }
  })

  it('沒有簡體字混入', () => {
    const SIMPLIFIED = /[书车东这们个国学习时间说话长门问题实产业]/
    for (const k of g1) {
      // 「学」本身是日文新字體，只檢查釋義文字
      expect(zh[k]!, `${k}: ${zh[k]}`).not.toMatch(SIMPLIFIED)
    }
  })
})
