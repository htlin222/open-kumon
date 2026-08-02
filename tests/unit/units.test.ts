import { describe, it, expect } from 'vitest'
import { mm, pt, pxToPt, A4, SAFE_BOX, MIN, MARGIN } from '../../src/print/units'

describe('列印單位換算（CSS 96dpi）', () => {
  it('1mm = 3.7795px', () => expect(mm(1)).toBeCloseTo(3.7795, 3))
  it('9pt = 12px（絕對字級下限）', () => expect(pt(9)).toBeCloseTo(12, 3))
  it('pxToPt 是 pt 的反函數', () => expect(pxToPt(pt(14))).toBeCloseTo(14, 6))
})

describe('A4 幾何', () => {
  it('A4 = 793.7 × 1122.5 px', () => {
    expect(A4.width).toBeCloseTo(793.7, 1)
    expect(A4.height).toBeCloseTo(1122.5, 1)
  })

  it('安全框 = 182 × 273mm', () => {
    expect(SAFE_BOX.width).toBeCloseTo(mm(182), 3)
    expect(SAFE_BOX.height).toBeCloseTo(mm(273), 3)
  })

  it('安全框左上角等於左／上邊界', () => {
    expect(SAFE_BOX.x).toBeCloseTo(MARGIN.left, 6)
    expect(SAFE_BOX.y).toBeCloseTo(MARGIN.top, 6)
  })

  it('安全框放得進 A4', () => {
    expect(SAFE_BOX.x + SAFE_BOX.width).toBeLessThanOrEqual(A4.width + 1e-6)
    expect(SAFE_BOX.y + SAFE_BOX.height).toBeLessThanOrEqual(A4.height + 1e-6)
  })
})

describe('尺寸下限（設計文件第 5 段）', () => {
  it('なぞり範字 22mm、書寫格 18mm', () => {
    expect(MIN.traceGlyph).toBeCloseTo(mm(22), 3)
    expect(MIN.writingCell).toBeCloseTo(mm(18), 3)
  })

  it('字級下限由大到小：例句 14 > 指示語 12 > 注記 10 > 絕對下限 9', () => {
    expect(MIN.sentencePt).toBeGreaterThan(MIN.instructionPt)
    expect(MIN.instructionPt).toBeGreaterThan(MIN.annotationPt)
    expect(MIN.annotationPt).toBeGreaterThan(MIN.absolutePt)
    expect(MIN.absolutePt).toBe(9)
  })

  it('一列最多放得下 8 個書寫格', () => {
    expect(Math.floor(SAFE_BOX.width / MIN.writingCell)).toBeGreaterThanOrEqual(8)
  })

  it('範字比書寫格大（範字要看得清楚才描得準）', () => {
    expect(MIN.traceGlyph).toBeGreaterThan(MIN.writingCell)
  })
})
