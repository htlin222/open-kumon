import type { KanjiEntry } from '../content/schema'
import { parseReading } from '../content/readings'

/**
 * 檢定題庫。
 *
 * 全部由已建構的內容推導出來，不另外維護一份題目 —— 內容改了，題目自動跟著改。
 * 選項的產生完全確定性（用索引取，不用亂數），所以同一個孩子重測會拿到同一份題，
 * 結果可比較。
 */

export interface Probe {
  id: string
  kind: 'kana' | 'kanji' | 'grammar'
  /** 出題的日文本體 */
  prompt: string
  /** 指示語一律 zh-TW —— 否則變成在考「看不看得懂題目」 */
  instruction: string
  choices: string[]
  answer: string
  /** kanji 題才有 */
  grade?: number
}

/** 五十音抽樣：涵蓋各行，避開容易混淆的長得像的字 */
const KANA_PAIRS: [string, string][] = [
  ['あ', 'a'], ['き', 'ki'], ['す', 'su'], ['て', 'te'], ['の', 'no'],
  ['は', 'ha'], ['み', 'mi'], ['ゆ', 'yu'], ['れ', 're'], ['を', 'wo'],
]

const KATAKANA_PAIRS: [string, string][] = [
  ['ア', 'a'], ['キ', 'ki'], ['ス', 'su'], ['テ', 'te'], ['ノ', 'no'],
  ['ハ', 'ha'], ['ミ', 'mi'], ['ユ', 'yu'], ['レ', 're'], ['ヲ', 'wo'],
]

/** 確定性地從候選裡挑 n 個不等於 answer 的干擾項 */
function distractors(pool: string[], answer: string, n: number, seed: number): string[] {
  const others = pool.filter((x) => x !== answer)
  const out: string[] = []
  for (let i = 0; out.length < n && i < others.length; i++) {
    const pick = others[(seed * 7 + i * 3) % others.length]!
    if (!out.includes(pick)) out.push(pick)
  }
  return out
}

/** 選項排序也要確定性，否則同一題每次位置不同 */
function arrange(answer: string, wrong: string[], seed: number): string[] {
  const all = [answer, ...wrong]
  const at = seed % all.length
  const rest = all.filter((x) => x !== answer)
  const out = [...rest]
  out.splice(at, 0, answer)
  return out
}

export function kanaProbes(count = 6): Probe[] {
  const out: Probe[] = []
  const romaji = [...KANA_PAIRS, ...KATAKANA_PAIRS].map(([, r]) => r)

  for (let i = 0; i < count; i++) {
    const useKatakana = i % 2 === 1
    const table = useKatakana ? KATAKANA_PAIRS : KANA_PAIRS
    const [char, answer] = table[(i * 3) % table.length]!
    out.push({
      id: `kana-${i}`,
      kind: 'kana',
      prompt: char,
      instruction: `這個${useKatakana ? '片' : '平'}假名怎麼唸？`,
      answer,
      choices: arrange(answer, distractors(romaji, answer, 3, i), i),
    })
  }
  return out
}

/** 某個年級的漢字讀音題。用訓読み優先（更貼近日常語彙） */
export function kanjiProbes(entries: KanjiEntry[], grade: number, count = 2): Probe[] {
  const usable = entries.filter((e) => e.kun.length > 0 || e.on.length > 0)
  const readingOf = (e: KanjiEntry) => {
    const raw = e.kun.find((r) => !parseReading(r).affixOnly) ?? e.on[0]!
    return parseReading(raw).stem
  }
  const pool = usable.map(readingOf)

  const out: Probe[] = []
  for (let i = 0; i < count && usable.length > 0; i++) {
    // 取該年級偏後段的字：前幾個字往往太簡單，測不出上限
    const entry = usable[Math.floor((usable.length * (i + 1)) / (count + 1))]!
    const answer = readingOf(entry)
    out.push({
      id: `kanji-g${grade}-${i}`,
      kind: 'kanji',
      grade,
      prompt: entry.kanji,
      instruction: '這個漢字怎麼唸？',
      answer,
      choices: arrange(answer, distractors(pool, answer, 3, grade * 5 + i), grade + i),
    })
  }
  return out
}

/** 助詞與語順。這批固定，因為要控制用字不超綱 */
export const GRAMMAR_PROBES: Probe[] = [
  {
    id: 'g-0',
    kind: 'grammar',
    prompt: 'わたし　　　　がくせいです。',
    instruction: '空格要填哪個字？',
    answer: 'は',
    choices: ['は', 'を', 'に', 'へ'],
  },
  {
    id: 'g-1',
    kind: 'grammar',
    prompt: 'ほん　　　　よみます。',
    instruction: '空格要填哪個字？',
    answer: 'を',
    choices: ['が', 'を', 'は', 'と'],
  },
  {
    id: 'g-2',
    kind: 'grammar',
    prompt: 'がっこう　　　　いきます。',
    instruction: '空格要填哪個字？',
    answer: 'へ',
    choices: ['で', 'を', 'へ', 'も'],
  },
  {
    id: 'g-3',
    kind: 'grammar',
    prompt: 'つくえ　　　　うえに あります。',
    instruction: '空格要填哪個字？',
    answer: 'の',
    choices: ['の', 'に', 'が', 'は'],
  },
]
