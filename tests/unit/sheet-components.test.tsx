import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { WritingCell } from '../../src/components/sheet/WritingCell'
import { TraceGlyph } from '../../src/components/sheet/TraceGlyph'
import type { StrokeData } from '../../src/content/strokes'

const strokes = JSON.parse(readFileSync('content/strokes/1.json', 'utf8')) as Record<
  string,
  StrokeData
>
const hana = strokes['花']!

describe('WritingCell', () => {
  it('標上 data-write-zone 讓稽核認得出來', () => {
    const { container } = render(<WritingCell />)
    expect(container.querySelector('[data-write-zone]')).not.toBeNull()
  })

  it('預設是 18mm 見方', () => {
    const { container } = render(<WritingCell />)
    const el = container.querySelector('[data-write-zone]') as HTMLElement
    expect(el.style.width).toBe('18mm')
    expect(el.style.height).toBe('18mm')
  })

  it('可以放大但不能縮小到下限以下', () => {
    const { container } = render(<WritingCell sizeMm={22} />)
    const el = container.querySelector('[data-write-zone]') as HTMLElement
    expect(el.style.width).toBe('22mm')
  })

  it('小於 18mm 會丟錯（版面出錯要在 build 時就爆，不要印出來才發現）', () => {
    expect(() => render(<WritingCell sizeMm={12} />)).toThrow(/18mm/)
  })

  it('畫十字リーダー輔助線', () => {
    const { container } = render(<WritingCell />)
    expect(container.querySelectorAll('line')).toHaveLength(2)
  })

  it('可以顯示淡色提示字（描完後自己寫的格子則不給）', () => {
    const { container } = render(<WritingCell hint="花" />)
    expect(container.textContent).toContain('花')
  })
})

describe('TraceGlyph', () => {
  it('渲染出全部 7 筆', () => {
    const { container } = render(<TraceGlyph data={hana} />)
    expect(container.querySelectorAll('path')).toHaveLength(7)
  })

  it('標上 data-trace-glyph 且尺寸 22mm', () => {
    const { container } = render(<TraceGlyph data={hana} />)
    const el = container.querySelector('[data-trace-glyph]') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.style.width).toBe('22mm')
  })

  it('沿用 KanjiVG 的 109×109 viewBox', () => {
    const { container } = render(<TraceGlyph data={hana} />)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 109 109')
  })

  it('預設是淡灰描邊（給孩子描的），不是實心', () => {
    const { container } = render(<TraceGlyph data={hana} />)
    const p = container.querySelector('path')!
    expect(p.getAttribute('fill')).toBe('none')
    expect(p.getAttribute('stroke')).toBe('#b0b0b0')
  })

  it('model 模式是深色範字', () => {
    const { container } = render(<TraceGlyph data={hana} variant="model" />)
    expect(container.querySelector('path')!.getAttribute('stroke')).toBe('#111')
  })

  it('可顯示筆順編號，數量等於筆畫數', () => {
    const { container } = render(<TraceGlyph data={hana} showNumbers />)
    expect(container.querySelectorAll('text')).toHaveLength(7)
  })

  it('不顯示編號時沒有任何 text 節點', () => {
    const { container } = render(<TraceGlyph data={hana} />)
    expect(container.querySelectorAll('text')).toHaveLength(0)
  })
})
