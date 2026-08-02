/**
 * A4 列印幾何與尺寸下限。
 *
 * 這裡的每個常數都會被 tests/audit 的 Playwright 稽核當成判準。
 * 想調整版面時改這裡，不要在元件裡寫死數字 —— 否則稽核抓不到。
 *
 * CSS 的 1in = 96px 是規範定義（與螢幕實際 DPI 無關），列印時瀏覽器
 * 依此換算成實體尺寸，所以這組換算對紙張是準的。
 */

export const PX_PER_MM = 96 / 25.4
export const PX_PER_PT = 96 / 72

/** 公釐 → CSS px */
export const mm = (v: number): number => v * PX_PER_MM
/** 點 → CSS px */
export const pt = (v: number): number => v * PX_PER_PT
/** CSS px → 點 */
export const pxToPt = (v: number): number => v / PX_PER_PT

export const A4 = {
  width: mm(210),
  height: mm(297),
} as const

export const MARGIN = {
  top: mm(12),
  right: mm(14),
  bottom: mm(12),
  left: mm(14),
} as const

/** 可用版面。任何元素超出這個框就是版型有問題 */
export const SAFE_BOX = {
  x: MARGIN.left,
  y: MARGIN.top,
  width: A4.width - MARGIN.left - MARGIN.right,
  height: A4.height - MARGIN.top - MARGIN.bottom,
} as const

/**
 * 尺寸下限。
 *
 * 這組數字的來源是「孩子要看得清楚、寫得下」，不是排版美感。
 * 稽核只檢查下限，版型可以做得更大。
 */
export const MIN = {
  /** なぞり範字邊長 */
  traceGlyph: mm(22),
  /** マス目書寫格邊長 */
  writingCell: mm(18),
  /** 例句 */
  sentencePt: 14,
  /** 指示語 */
  instructionPt: 12,
  /** 注記・振假名 */
  annotationPt: 10,
  /** 絕對下限：紙上任何一個字都不得小於此 */
  absolutePt: 9,
  /** 插圖與書寫區之間的淨空距離（mm） */
  clearanceMm: 5,
  /** 單頁非白像素比例上限 */
  inkCoverage: 0.08,
} as const

/** 稽核用的 DOM 標記 */
export const MARKER = {
  /** 孩子會下筆的區域，周圍必須淨空 */
  writeZone: 'data-write-zone',
  /** 插圖，不得侵入書寫區 */
  illustration: 'data-illustration',
  /** なぞり範字，尺寸受 MIN.traceGlyph 約束 */
  traceGlyph: 'data-trace-glyph',
} as const
