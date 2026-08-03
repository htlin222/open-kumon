import {
  STORAGE_KEY,
  BACKUP_KEY,
  StoreSchema,
  emptyStore,
  type Store,
  type Child,
  type Completion,
} from './schema'
import { applyResult } from '../curriculum/srs'
import { defaultStorage, type StorageLike } from './backend'
import type { DayKey } from '../curriculum/day'

/**
 * 進度儲存。
 *
 * 純 localStorage，沒有後端。設計文件選的是「先讓它離線就能跑完整循環」，
 * D1 同步留到之後 —— 網路斷了照樣要能印今天這張、勾今天的錯題。
 *
 * 所有操作都是不可變的：傳入舊 store，回傳新 store。
 */

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `c${Math.random().toString(36).slice(2, 10)}`

/**
 * 讀取。任何問題都退回空 store 而不是丟例外 ——
 * 孩子明天早上還是要有一張紙可以印，不能因為資料壞了就整個站白畫面。
 * 壞掉的原始資料留一份備份，之後還有救回來的機會。
 */
export function loadStore(storage: StorageLike = defaultStorage()): Store {
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return emptyStore()
  }
  if (!raw) return emptyStore()

  const salvage = () => {
    try {
      storage.setItem(BACKUP_KEY, raw!)
      storage.removeItem(STORAGE_KEY)
    } catch {
      /* 備份失敗也不能擋住使用 */
    }
    return emptyStore()
  }

  try {
    const parsed = StoreSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : salvage()
  } catch {
    return salvage()
  }
}

export function saveStore(store: Store, storage: StorageLike = defaultStorage()): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* 配額滿或隱私模式：不擋住使用，只是這次沒存到 */
  }
}

export function addChild(store: Store, name: string, today: DayKey, grade = 1): Store {
  const child: Child = {
    id: newId(),
    name,
    createdOn: today,
    // 程度檢定判定的起始年級；沒做檢定就是 1
    grade: Math.min(Math.max(1, grade), 6),
    nextUnitNo: 1,
    mistakes: [],
    completions: [],
  }
  return {
    ...store,
    children: [...store.children, child],
    activeChildId: store.activeChildId ?? child.id,
  }
}

export function activeChild(store: Store): Child | null {
  return store.children.find((c) => c.id === store.activeChildId) ?? null
}

/**
 * 記錄一回完成。
 *
 * 正課完成才推進主線；複習卷不推進 —— 複習是回收，不是前進。
 * 同一天同一回重複送出視為同一次（家長按兩下不該跳過一回）。
 */
export function recordCompletion(store: Store, childId: string, entry: Completion): Store {
  const i = store.children.findIndex((c) => c.id === childId)
  if (i === -1) return store

  const child = store.children[i]!
  const already = child.completions.some(
    (c) => c.day === entry.day && c.kind === entry.kind && c.unitNo === entry.unitNo,
  )
  if (already) return store

  const next: Child = {
    ...child,
    nextUnitNo: entry.kind === 'lesson' ? child.nextUnitNo + 1 : child.nextUnitNo,
    mistakes: applyResult(child.mistakes, { wrong: entry.wrong, right: entry.right }, entry.day),
    completions: [...child.completions, entry],
  }

  const children = [...store.children]
  children[i] = next
  return { ...store, children }
}

/**
 * 升上下一個年級。
 *
 * 刻意做成家長按按鈕，而不是做完最後一回就自動跳 —— 升級是個里程碑，
 * 值得被看見；而且錯題本裡還有東西時，家長可能想先把它清乾淨再往上走。
 */
export function promoteGrade(store: Store, childId: string): Store {
  const i = store.children.findIndex((c) => c.id === childId)
  if (i === -1) return store
  const child = store.children[i]!
  if (child.grade >= 6) return store

  const children = [...store.children]
  children[i] = { ...child, grade: child.grade + 1, nextUnitNo: 1 }
  return { ...store, children }
}

export function setActiveChild(store: Store, childId: string): Store {
  return store.children.some((c) => c.id === childId) ? { ...store, activeChildId: childId } : store
}

/** localStorage 會被清掉，所以給一條手動備份的路 */
export function exportJson(store: Store): string {
  return JSON.stringify(store, null, 2)
}

export type ImportResult = { ok: true; store: Store } | { ok: false; error: string }

export function importJson(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '不是有效的 JSON' }
  }

  const parsed = StoreSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: `資料格式不符：${first?.path.join('.')} ${first?.message}` }
  }
  return { ok: true, store: parsed.data }
}
