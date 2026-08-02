/**
 * 儲存後端抽象。
 *
 * 不直接抓 globalThis.localStorage，理由有三個，都是真實情境：
 *   - Safari 無痕模式與部分瀏覽器設定下 localStorage 會不存在或一寫就丟例外
 *   - jsdom 在 opaque origin 下根本不提供 localStorage（本專案的測試環境就是）
 *   - 之後要換成 D1 同步時，只要換掉這一層
 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** 記憶體版：測試用，也是瀏覽器不給 localStorage 時的退路 */
export function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

let fallback: StorageLike | null = null

/**
 * 瀏覽器的 localStorage；拿不到就退回單次工作階段的記憶體版。
 * 退回時進度不會跨頁存活，但網站仍然可用 —— 這比整個掛掉好。
 */
export function defaultStorage(): StorageLike {
  try {
    const ls = globalThis.localStorage
    if (ls) {
      // 有些瀏覽器 getItem 拿得到但 setItem 會丟（配額為 0）
      const probe = '__open-kumon-probe__'
      ls.setItem(probe, '1')
      ls.removeItem(probe)
      return ls
    }
  } catch {
    /* 掉到下面的記憶體版 */
  }
  fallback ??= memoryStorage()
  return fallback
}
