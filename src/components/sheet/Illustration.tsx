export interface IllustrationProps {
  /** OpenMoji hexcode */
  code: string
  sizeMm?: number
  /** 給 alt 用；紙上看不到，但螢幕朗讀與除錯用得上 */
  label?: string
}

/**
 * 意味插圖。
 *
 * 紙面沒有中文，所以這張圖就是孩子唯一的語意線索。
 * 帶 data-illustration 標記 —— Playwright 稽核靠它確認圖沒有壓到書寫區。
 */
export function Illustration({ code, sizeMm = 14, label }: IllustrationProps) {
  return (
    <img
      data-illustration=""
      src={`/openmoji/${code}.svg`}
      alt={label ?? ''}
      width={`${sizeMm}mm`}
      height={`${sizeMm}mm`}
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm`, flex: '0 0 auto' }}
    />
  )
}
