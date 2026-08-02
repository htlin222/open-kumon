/** 一個漢字的筆順資料，抽自 KanjiVG（CC BY-SA 3.0） */
export interface StrokeData {
  /** 一律 "0 0 109 109"（KanjiVG 標準畫布） */
  viewBox: string
  /** SVG path 的 d 屬性，依筆順排列 */
  paths: string[]
  /** 對應每一筆的編號標示座標 [x, y] */
  numbers: [number, number][]
}

/** KanjiVG 畫布邊長 */
export const KANJIVG_SIZE = 109
