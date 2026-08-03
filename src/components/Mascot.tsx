/**
 * 陪伴角色。
 *
 * 原本要用 Open Peeps / Humaaans，兩條路都走不通：Open Peeps 沒有可程式化取得的
 * 發布（官網是 Sketch/Figma 檔手動下載），react-humaaans 是 2019 年的 UMD bundle，
 * 在 ESM 下沒有可用的 default export，載入就讓頁面炸掉。
 *
 * 所以自己畫。純線稿、無填色，好處是螢幕與紙面共用一套，而且碳粉覆蓋率算得準 ——
 * 那兩套素材原生都是彩色實心填充，要上紙本來就得先轉線稿。
 */

const STROKE = { fill: 'none', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export type MascotMood = 'wave' | 'write' | 'cheer'

export interface MascotProps {
  mood?: MascotMood
  size?: number
  /** 紙面用淡灰，螢幕用深色 */
  color?: string
}

export function Mascot({ mood = 'wave', size = 140, color = 'currentColor' }: MascotProps) {
  return (
    <svg
      viewBox="0 0 100 130"
      width={size}
      height={(size * 130) / 100}
      stroke={color}
      {...STROKE}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* 頭 */}
      <circle cx="50" cy="26" r="17" />
      {/* 眼睛：笑瞇瞇 */}
      <path d="M43 23 q3 -3 6 0" />
      <path d="M54 23 q3 -3 6 0" />
      {/* 嘴 */}
      <path d="M45 31 q5 5 10 0" />
      {/* 身體 */}
      <path d="M50 43 v34" />
      {/* 腿 */}
      <path d="M50 77 l-11 24" />
      <path d="M50 77 l11 24" />

      {mood === 'wave' && (
        <>
          <path d="M50 52 l-18 14" />
          <path d="M50 52 l18 -14" />
          {/* 揮動的線條 */}
          <path d="M72 32 q5 -3 4 -8" strokeWidth="2" />
        </>
      )}

      {mood === 'write' && (
        <>
          <path d="M50 52 l-16 16" />
          <path d="M50 52 l16 8" />
          {/* 鉛筆 */}
          <path d="M64 62 l14 -10" strokeWidth="2.5" />
          <path d="M78 52 l4 -3 2 4 -4 3 z" strokeWidth="2" />
        </>
      )}

      {mood === 'cheer' && (
        <>
          <path d="M50 52 l-17 -13" />
          <path d="M50 52 l17 -13" />
          {/* 上方的小星星 */}
          <path d="M50 4 v6 M47 7 h6" strokeWidth="2" />
          <path d="M24 16 v4 M22 18 h4" strokeWidth="2" />
          <path d="M76 16 v4 M74 18 h4" strokeWidth="2" />
        </>
      )}
    </svg>
  )
}
