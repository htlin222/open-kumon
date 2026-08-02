import { PNG } from 'pngjs'

/**
 * 非白像素比例 —— 用來估算碳粉／墨水消耗。
 *
 * 判準刻意寬鬆（任一通道低於 250 就算有色），因為淡灰的なぞり底稿與
 * 輔助線也是要耗墨的，不能只算純黑。
 */
export function inkCoverage(png: Buffer): number {
  const img = PNG.sync.read(png)
  let inked = 0

  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i]!
    const g = img.data[i + 1]!
    const b = img.data[i + 2]!
    const a = img.data[i + 3]!
    if (a > 8 && (r < 250 || g < 250 || b < 250)) inked++
  }

  return inked / (img.width * img.height)
}
