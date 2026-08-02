/**
 * KANJIDIC 讀音的顯示正規化。
 *
 * 原始資料帶兩種標記，都不能印到紙上：
 *   ひと.つ  →  `.` 後面是送假名，日本教材印成「ひと(つ)」或只印「ひと」
 *   -ノン    →  `-` 表示這個讀音只出現在複合詞的特定位置
 *   ひと-    →  同上，接在前面
 */

export interface Reading {
  /** 漢字本身讀出來的部分 */
  stem: string
  /** 送假名（不含在漢字裡，寫在後面的かな） */
  okurigana: string
  /** 只用於複合詞 */
  affixOnly: boolean
}

export function parseReading(raw: string): Reading {
  const affixOnly = raw.startsWith('-') || raw.endsWith('-')
  const body = raw.replace(/^-|-$/g, '')
  const dot = body.indexOf('.')
  return dot === -1
    ? { stem: body, okurigana: '', affixOnly }
    : { stem: body.slice(0, dot), okurigana: body.slice(dot + 1), affixOnly }
}

/** 印在紙上的形式：`ひと.つ` → `ひと(つ)` */
export function forPrint(raw: string): string {
  const { stem, okurigana } = parseReading(raw)
  return okurigana ? `${stem}(${okurigana})` : stem
}

/**
 * 挑出要印在練習單上的讀音。
 *
 * 一年級的紙面塞不下全部讀音，而且塞了也是干擾。規則：
 *   - 丟掉只用於複合詞的（`-` 標記）
 *   - 音読み・訓読み 各取最多 limit 個
 */
export function pickForSheet(
  readings: string[],
  limit = 2,
): string[] {
  return readings
    .filter((r) => !parseReading(r).affixOnly)
    .slice(0, limit)
    .map(forPrint)
}
