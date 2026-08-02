/**
 * 令和2年度（2020）実施の学年別漢字配当表 改訂 patch。
 *
 * 舊表（1989年版・1006字，KANJIDIC2 與 kanjiapi.dev 至今仍是這版）
 *   ↓ 套用本 patch
 * 現行表（平成29年告示・1026字）
 *
 * 出處：文部科学省「小学校学習指導要領（平成29年告示）別表 学年別漢字配当表」
 *      對照表參考 https://kanji.jitenon.jp/info/1
 *
 * 驗算（三個年級必須同時對上，任一不合即 patch 有誤）：
 *   4年 200 +20 −21(→5) −2(→6) +4(5→4) +1(6→4) = 202 ✓
 *   5年 185 +21(4→5) −9(→6) −4(→4)              = 193 ✓
 *   6年 181 +9(5→6) +2(4→6) −1(→4)              = 191 ✓
 */

/**
 * 中学以上 → 小4 新加入的 20 個都道府県漢字。
 * 目的是讓學生在四年級結束前能讀出全部 47 個都道府県名。
 */
export const PREFECTURE_KANJI = [...'茨媛岡潟岐熊香佐埼崎滋鹿縄井沖栃奈梨阪阜'] as const

/** 新加入 4 年級的字（現行版本即等於都道府県漢字） */
export const ADDED_TO_G4 = PREFECTURE_KANJI

export interface KanjiMove {
  kanji: string
  from: number
  to: number
}

const moves = (chars: string, from: number, to: number): KanjiMove[] =>
  [...chars].map((kanji) => ({ kanji, from, to }))

/** 年級間的移動 */
export const MOVED: readonly KanjiMove[] = [
  // 4年 → 5年（21字）：為了騰出空間給都道府県漢字
  ...moves('囲紀喜救型航告殺士史象賞貯停堂得毒費粉脈歴', 4, 5),
  // 4年 → 6年（2字）
  ...moves('胃腸', 4, 6),
  // 5年 → 6年（9字）
  ...moves('恩券承舌銭退敵俵預', 5, 6),
  // 5年 → 4年（4字）
  ...moves('賀群徳富', 5, 4),
  // 6年 → 4年（1字）
  ...moves('城', 6, 4),
]
