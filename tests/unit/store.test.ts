import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStore,
  saveStore,
  addChild,
  recordCompletion,
  exportJson,
  importJson,
} from '../../src/storage/store'
import { STORAGE_KEY, BACKUP_KEY, emptyStore, type Store } from '../../src/storage/schema'
import { memoryStorage, type StorageLike } from '../../src/storage/backend'

const TODAY = '2026-08-03'

let mem: StorageLike
beforeEach(() => {
  mem = memoryStorage()
})

describe('loadStore', () => {
  it('沒有資料時回傳空的 store', () => {
    expect(loadStore(mem)).toEqual(emptyStore())
  })

  it('讀得回自己寫的資料', () => {
    const s = addChild(emptyStore(), '小明', TODAY)
    saveStore(s, mem)
    expect(loadStore(mem)).toEqual(s)
  })

  it('壞掉的 JSON → 回退空 store，不丟例外', () => {
    mem.setItem(STORAGE_KEY, '{ 這不是 json')
    expect(() => loadStore(mem)).not.toThrow()
    expect(loadStore(mem)).toEqual(emptyStore())
  })

  it('結構不符 schema → 回退空 store', () => {
    mem.setItem(STORAGE_KEY, JSON.stringify({ version: 1, children: 'nope' }))
    expect(loadStore(mem)).toEqual(emptyStore())
  })

  it('版本不符 → 回退空 store', () => {
    mem.setItem(STORAGE_KEY, JSON.stringify({ version: 99, children: [], activeChildId: null }))
    expect(loadStore(mem)).toEqual(emptyStore())
  })

  it('回退時把壞資料留成備份（別直接丟掉孩子的進度）', () => {
    mem.setItem(STORAGE_KEY, '{ 壞掉了')
    loadStore(mem)
    expect(mem.getItem(BACKUP_KEY)).toBe('{ 壞掉了')
  })
})

describe('addChild', () => {
  it('第一個孩子自動成為 active', () => {
    const s = addChild(emptyStore(), '小明', TODAY)
    expect(s.children).toHaveLength(1)
    expect(s.activeChildId).toBe(s.children[0]!.id)
  })

  it('第二個孩子不會搶走 active', () => {
    const s = addChild(addChild(emptyStore(), '小明', TODAY), '小華', TODAY)
    expect(s.children).toHaveLength(2)
    expect(s.activeChildId).toBe(s.children[0]!.id)
  })

  it('每個孩子拿到不同的 id', () => {
    const s = addChild(addChild(emptyStore(), '小明', TODAY), '小華', TODAY)
    expect(s.children[0]!.id).not.toBe(s.children[1]!.id)
  })

  it('新孩子從 1 年級第 1 回開始，錯題本是空的', () => {
    const c = addChild(emptyStore(), '小明', TODAY).children[0]!
    expect(c).toMatchObject({ grade: 1, nextUnitNo: 1, mistakes: [], completions: [] })
  })

  it('不會就地修改傳入的 store', () => {
    const before = emptyStore()
    addChild(before, '小明', TODAY)
    expect(before.children).toEqual([])
  })
})

describe('recordCompletion', () => {
  const withChild = (): { store: Store; id: string } => {
    const store = addChild(emptyStore(), '小明', TODAY)
    return { store, id: store.children[0]!.id }
  }

  it('正課完成 → 主線推進一回', () => {
    const { store, id } = withChild()
    const next = recordCompletion(store, id, {
      day: TODAY,
      kind: 'lesson',
      unitNo: 1,
      wrong: [],
      right: ['一', '七', '三'],
    })
    expect(next.children[0]!.nextUnitNo).toBe(2)
  })

  it('複習卷完成 → 主線不動', () => {
    const { store, id } = withChild()
    const next = recordCompletion(store, id, {
      day: TODAY,
      kind: 'review',
      unitNo: null,
      wrong: [],
      right: ['一'],
    })
    expect(next.children[0]!.nextUnitNo).toBe(1)
  })

  it('勾錯的字進錯題本，3 天後到期', () => {
    const { store, id } = withChild()
    const next = recordCompletion(store, id, {
      day: TODAY,
      kind: 'lesson',
      unitNo: 1,
      wrong: ['七'],
      right: ['一', '三'],
    })
    expect(next.children[0]!.mistakes).toEqual([
      { kanji: '七', stage: 0, dueOn: '2026-08-06', updatedAt: TODAY },
    ])
  })

  it('留下完成紀錄', () => {
    const { store, id } = withChild()
    const next = recordCompletion(store, id, {
      day: TODAY,
      kind: 'lesson',
      unitNo: 1,
      wrong: [],
      right: ['一'],
    })
    expect(next.children[0]!.completions).toHaveLength(1)
  })

  it('同一天同一回重複送出不會推進兩次', () => {
    const { store, id } = withChild()
    const entry = { day: TODAY, kind: 'lesson' as const, unitNo: 1, wrong: [], right: ['一'] }
    const twice = recordCompletion(recordCompletion(store, id, entry), id, entry)
    expect(twice.children[0]!.nextUnitNo).toBe(2)
    expect(twice.children[0]!.completions).toHaveLength(1)
  })

  it('找不到孩子就原樣回傳', () => {
    const { store } = withChild()
    const next = recordCompletion(store, '不存在', {
      day: TODAY,
      kind: 'lesson',
      unitNo: 1,
      wrong: [],
      right: [],
    })
    expect(next).toEqual(store)
  })
})

describe('匯出／匯入', () => {
  it('匯出再匯入還原成同一份資料', () => {
    const base = addChild(emptyStore(), '小明', TODAY)
    const s = recordCompletion(base, base.children[0]!.id, {
      day: TODAY,
      kind: 'lesson',
      unitNo: 1,
      wrong: ['七'],
      right: [],
    })
    const restored = importJson(exportJson(s))
    expect(restored.ok && restored.store).toEqual(s)
  })

  it('匯入垃圾會被擋下並說明原因', () => {
    const r = importJson('{ 不是有效資料 }')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/./)
  })

  it('匯入結構不符的資料會被擋下', () => {
    const r = importJson(JSON.stringify({ version: 1, children: [{ id: 1 }] }))
    expect(r.ok).toBe(false)
  })
})
