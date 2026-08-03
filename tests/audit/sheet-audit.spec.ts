import { test, expect } from '@playwright/test'
import { MIN, SAFE_BOX, pt, mm, MARKER } from '../../src/print/units'
import { inkCoverage } from './helpers'

/**
 * 列印保真度稽核。
 *
 * 「字別太小」「書寫區乾淨」不是口頭約定 —— 這六道關卡會讓 CI 紅。
 * 任何一項失敗時，要改的是版型，不是閾值。
 */

interface Case {
  series: string
  grade: number
  unit: number
}

const CASES: Case[] = [
  { series: 'kanji', grade: 1, unit: 1 },
  { series: 'kanji', grade: 1, unit: 14 },
  { series: 'kanji', grade: 1, unit: 27 },
  // 2 年級的字筆畫多很多（「顔」18 畫），筆順條會換行、範字更擠
  { series: 'kanji', grade: 2, unit: 1 },
  { series: 'kanji', grade: 2, unit: 40 },
  { series: 'kanji', grade: 2, unit: 54 },
  { series: 'kanji', grade: 3, unit: 1 },
  { series: 'kanji', grade: 3, unit: 67 },
  { series: 'kanji', grade: 4, unit: 1 },
  { series: 'kanji', grade: 4, unit: 68 },
  { series: 'kanji', grade: 5, unit: 1 },
  { series: 'kanji', grade: 5, unit: 65 },
  // 書き方：一頁三個字、每字 3 描 4 寫，是格子最密的版型
  { series: 'kakikata', grade: 1, unit: 4 },
  { series: 'kakikata', grade: 5, unit: 30 },
  // 語彙：例句是唯一「一整行日文」的版型，行長與斷行要驗
  { series: 'vocab', grade: 3, unit: 1 },
  { series: 'vocab', grade: 5, unit: 10 },
  { series: 'grammar', grade: 1, unit: 1 },
  { series: 'grammar', grade: 4, unit: 12 },
]

for (const c of CASES) {
  for (const side of ['front', 'back'] as const) {
    const name = `${c.series}-g${c.grade}-u${c.unit}-${side}`

    test.describe(name, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(
          `/?series=${c.series}&grade=${c.grade}&unit=${c.unit}&side=${side}&raw=1`,
          { waitUntil: 'networkidle' },
        )
        await page.emulateMedia({ media: 'print' })
        await page.evaluate(() => document.fonts.ready)
        await expect(page.locator('.sheet')).toBeVisible()
      })

      test('1. 不溢出 A4 安全框', async ({ page }) => {
        const overflow = await page.evaluate((box) => {
          const sheet = document.querySelector('.sheet')!
          const origin = sheet.getBoundingClientRect()
          const out: string[] = []

          for (const el of sheet.querySelectorAll<HTMLElement>('*')) {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            const x = r.left - origin.left
            const y = r.top - origin.top
            if (
              x < box.x - 0.5 ||
              y < box.y - 0.5 ||
              x + r.width > box.x + box.width + 0.5 ||
              y + r.height > box.y + box.height + 0.5
            ) {
              out.push(
                `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''} ` +
                  `(${x.toFixed(0)},${y.toFixed(0)} ${r.width.toFixed(0)}×${r.height.toFixed(0)})`,
              )
            }
          }
          return out
        }, SAFE_BOX)

        expect(overflow, `溢出安全框：\n  ${overflow.join('\n  ')}`).toHaveLength(0)
      })

      test('2. 沒有小於 9pt 的字', async ({ page }) => {
        const tooSmall = await page.evaluate((minPx) => {
          const out: string[] = []

          for (const el of document.querySelectorAll<HTMLElement>('.sheet *')) {
            const own = [...el.childNodes].some(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
            )
            if (!own) continue

            // SVG 內的 font-size 是 user unit，要乘上 viewBox 到螢幕的縮放才是
            // 真實印出來的大小。少了這一步，一個 22mm 範字裡的「9」會被誤判成
            // 9px 合格，實際上只有 5.6pt。
            let scale = 1
            const asSvg = el as unknown as SVGGraphicsElement
            if (typeof asSvg.getScreenCTM === 'function') {
              scale = asSvg.getScreenCTM()?.a ?? 1
            }

            const px = parseFloat(getComputedStyle(el).fontSize) * scale
            if (px < minPx - 0.01) {
              out.push(
                `"${el.textContent?.trim().slice(0, 12)}" ${px.toFixed(1)}px` +
                  (scale !== 1 ? `（SVG 縮放 ×${scale.toFixed(2)}）` : ''),
              )
            }
          }
          return out
        }, pt(MIN.absolutePt))

        expect(tooSmall, `小於 ${MIN.absolutePt}pt：\n  ${tooSmall.join('\n  ')}`).toHaveLength(0)
      })

      test('3. 插圖與書寫區保持 5mm 淨空', async ({ page }) => {
        const collisions = await page.evaluate(
          ({ buf, zoneSel, artSel }) => {
            const zones = [...document.querySelectorAll(zoneSel)].map((e) =>
              e.getBoundingClientRect(),
            )
            const arts = [...document.querySelectorAll(artSel)].map((e) => e.getBoundingClientRect())
            const out: string[] = []

            for (const a of arts) {
              for (const z of zones) {
                const clear =
                  a.right < z.left - buf ||
                  a.left > z.right + buf ||
                  a.bottom < z.top - buf ||
                  a.top > z.bottom + buf
                if (!clear) {
                  out.push(
                    `圖(${a.left.toFixed(0)},${a.top.toFixed(0)}) 貼到 格(${z.left.toFixed(0)},${z.top.toFixed(0)})`,
                  )
                }
              }
            }
            return out
          },
          {
            buf: mm(MIN.clearanceMm),
            zoneSel: `[${MARKER.writeZone}]`,
            artSel: `[${MARKER.illustration}]`,
          },
        )

        expect(collisions, `插圖侵入書寫區：\n  ${collisions.join('\n  ')}`).toHaveLength(0)
      })

      test('4. 碳粉覆蓋率 ≤ 8%', async ({ page }, testInfo) => {
        const png = await page.locator('.sheet').screenshot()
        const ratio = inkCoverage(png)
        await testInfo.attach('ink-coverage', {
          body: `${(ratio * 100).toFixed(2)}%`,
          contentType: 'text/plain',
        })
        expect(ratio, `碳粉覆蓋率 ${(ratio * 100).toFixed(2)}%`).toBeLessThanOrEqual(
          MIN.inkCoverage,
        )
      })

      test('5. 範字與書寫格達到尺寸下限', async ({ page }) => {
        const traces = page.locator(`[${MARKER.traceGlyph}]`)
        const cells = page.locator(`[${MARKER.writeZone}]`)

        for (let i = 0; i < (await traces.count()); i++) {
          const box = (await traces.nth(i).boundingBox())!
          expect(box.width, `範字 #${i} 寬 ${box.width.toFixed(1)}px`).toBeGreaterThanOrEqual(
            MIN.traceGlyph - 0.5,
          )
        }

        // 姓名欄也帶 write-zone 標記，尺寸規則只適用於方格
        const square = []
        for (let i = 0; i < (await cells.count()); i++) {
          const box = (await cells.nth(i).boundingBox())!
          if (Math.abs(box.width - box.height) < 2) square.push(box)
        }
        expect(square.length, '找不到任何方形書寫格').toBeGreaterThan(0)
        for (const box of square) {
          expect(box.width).toBeGreaterThanOrEqual(MIN.writingCell - 0.5)
        }
      })

      test('6. 視覺回歸', async ({ page }) => {
        // 只在本機跑。baseline 是在 macOS 產生的，Linux runner 的字型渲染
        // 不可能逐像素吻合，在 CI 比對只會製造假警報。
        // 關卡 1–5 量的是尺寸與版面，跨平台一致，CI 照跑。
        test.skip(!!process.env.CI, '視覺回歸只在本機執行（baseline 綁定 macOS 字型渲染）')

        // 容差刻意收緊：1% 相當於 35000 個像素，足以讓「拿掉筆順編號、加上筆順條」
        // 這種真實改動整個溜過去（實際發生過）。0.1% 仍能吸收字型反鋸齒雜訊。
        await expect(page.locator('.sheet')).toHaveScreenshot(`${name}.png`, {
          maxDiffPixelRatio: 0.001,
        })
      })
    })
  }
}
