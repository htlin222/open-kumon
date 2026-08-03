/**
 * 從 JMdict（含 Tatoeba 例句）挑出各年級可用的語彙。
 *
 *   pnpm content:vocab
 *
 * 【為什麼是「挑」而不是「生成」】
 * 專案擁有者不懂日文，所以「生成日文再請人審核」這個品質關卡實際上沒有把關的人。
 * 因此日文一個字都不生成 —— 單字、讀音、例句全部逐字引用自 JMdict 與 Tatoeba，
 * 都是已出版、真人撰寫的語料。這支腳本只做篩選：
 *
 *   1. 只收 common 標記的詞（JMdict 自己標的高頻詞）
 *   2. 詞的漢字必須全部在「該年級及以下」的配当表內
 *   3. 例句的漢字也必須全部在範圍內 —— 否則孩子看到讀不出來的字
 *   4. 排除專有名詞、古語、罕用、俗語
 *
 * 中文釋義另外處理（content/source/vocab-zh.json），那部分擁有者看得懂、能檢查。
 *
 * 來源：JMdict (EDRDG, CC BY-SA 4.0) · 例句 Tatoeba (CC BY 2.0 FR)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { TARGET_GRADES, type KanjiEntry } from '../src/content/schema.ts'
import { makeKanjiGuard } from '../src/content/guard.ts'

interface JmdictWord {
  id: string
  kanji: { text: string; common: boolean; tags: string[] }[]
  kana: { text: string; common: boolean; tags: string[] }[]
  sense: {
    partOfSpeech: string[]
    misc: string[]
    gloss: { text: string }[]
    examples?: { sentences: { lang: string; text: string }[] }[]
  }[]
}

export interface VocabEntry {
  /** 表記（含漢字） */
  ja: string
  /** 讀音（假名） */
  reading: string
  /** 英文釋義，取前兩個 —— 中文釋義另外維護 */
  glossEn: string[]
  partOfSpeech: string[]
  /** 例句原文，逐字引用自 Tatoeba */
  example: string | null
  exampleEn: string | null
  /** 這個詞用到的漢字 */
  kanji: string[]
}

/** 不適合小學生的詞性與標記 */
const SKIP_MISC = new Set([
  'arch', 'obs', 'obsc', 'rare', 'sl', 'vulg', 'derog', 'X', 'col', 'joc', 'dated',
])
const SKIP_POS = new Set(['n-pr', 'unc'])

/**
 * 該排除的漢字表記標記。
 *   rK = 罕用的漢字寫法（例：これ等，實際上幾乎都寫 これら）
 *   iK = 不規則寫法    sK = 只用於檢索，不該顯示
 * JMdict 的 common 是就「這個詞」而言，不保證「這個漢字寫法」常用。
 */
const SKIP_KANJI_TAGS = new Set(['rK', 'iK', 'sK', 'oK'])

const RAW = 'data/raw'

function findJmdict(): string {
  const f = readdirSync(RAW).find((n) => n.startsWith('jmdict-examples-eng') && n.endsWith('.json'))
  if (!f) throw new Error(`找不到 ${RAW}/jmdict-examples-eng-*.json —— 先跑下載步驟`)
  return `${RAW}/${f}`
}

const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>
const guard = makeKanjiGuard(table)

console.log('讀取 JMdict…')
const dict = JSON.parse(readFileSync(findJmdict(), 'utf8')) as { words: JmdictWord[] }
console.log(`  ${dict.words.length} 個詞條`)

const HAS_KANJI = /\p{Script=Han}/u

/** 每個年級收多少詞 —— 一回 8 個，夠跑完該年級的回數就好 */
const TARGET_PER_GRADE = 300

mkdirSync('content/vocab', { recursive: true })

for (const grade of TARGET_GRADES) {
  const kanjiPath = `content/kanji/${grade}.json`
  if (!existsSync(kanjiPath)) continue
  const known = new Set(
    [1, 2, 3, 4, 5]
      .filter((g) => g <= grade)
      .flatMap((g) =>
        existsSync(`content/kanji/${g}.json`)
          ? (JSON.parse(readFileSync(`content/kanji/${g}.json`, 'utf8')) as KanjiEntry[]).map(
              (e) => e.kanji,
            )
          : [],
      ),
  )
  // 這個年級「新學的字」—— 語彙優先挑用到新字的詞
  const fresh = new Set(
    (JSON.parse(readFileSync(kanjiPath, 'utf8')) as KanjiEntry[]).map((e) => e.kanji),
  )

  const picked: VocabEntry[] = []

  for (const w of dict.words) {
    const form = w.kanji.find((k) => k.common && !k.tags.some((t) => SKIP_KANJI_TAGS.has(t)))
    if (!form || !HAS_KANJI.test(form.text)) continue

    const sense = w.sense.find(
      (s) =>
        s.gloss.length > 0 &&
        !s.misc.some((m) => SKIP_MISC.has(m)) &&
        !s.partOfSpeech.some((p) => SKIP_POS.has(p)),
    )
    if (!sense) continue

    // 詞本身不得超綱
    if (!guard.check(form.text, grade).ok) continue
    // 至少用到一個這個年級新學的字，否則它屬於更早的年級
    if (![...form.text].some((c) => fresh.has(c))) continue

    const reading = w.kana.find((k) => k.common && !k.tags.some((t) => SKIP_KANJI_TAGS.has(t)))?.text
      ?? w.kana[0]?.text
    if (!reading) continue

    // 例句也必須全部在範圍內 —— 例句裡出現讀不出來的字，這個例句就是負擔
    let example: string | null = null
    let exampleEn: string | null = null
    for (const s of w.sense) {
      for (const ex of s.examples ?? []) {
        const jp = ex.sentences.find((x) => x.lang === 'jpn')?.text
        const en = ex.sentences.find((x) => x.lang === 'eng')?.text
        if (!jp || !guard.check(jp, grade).ok) continue
        // 太長的句子對小學生沒有意義
        if (jp.length > 28) continue
        example = jp
        exampleEn = en ?? null
        break
      }
      if (example) break
    }

    picked.push({
      ja: form.text,
      reading,
      glossEn: sense.gloss.slice(0, 2).map((g) => g.text),
      partOfSpeech: sense.partOfSpeech,
      example,
      exampleEn,
      kanji: [...new Set([...form.text].filter((c) => HAS_KANJI.test(c) && known.has(c)))],
    })

  }

  // 掃完整本詞典再排序。之前掃到額度就停，結果整批都是詞典前段的「お…」開頭，
  // 那是掃描順序的產物，不是選詞的判斷。
  //
  // 排序準則，由重到輕：
  //   1. 有例句 —— 例句是這套教材的重點，沒例句的只是字表
  //   2. 短的優先 —— 二三字的詞對小學生比五字的複合詞好用
  //   3. 表記與字典順序 —— 讓結果可重現
  picked.sort(
    (a, b) =>
      Number(Boolean(b.example)) - Number(Boolean(a.example)) ||
      a.ja.length - b.ja.length ||
      (a.ja < b.ja ? -1 : a.ja > b.ja ? 1 : 0),
  )
  // 同一個表記在 JMdict 可能有多筆（同形異音，例如 表 = ひょう / おもて）。
  // 對語言學而言那是兩個詞，但同一張紙上出現兩次同樣的表記只會讓孩子困惑，
  // 所以依表記去重 —— 排序已經把有例句的排前面，留下的就是較有用的那筆。
  const seen = new Set<string>()
  const out = picked
    .filter((e) => (seen.has(e.ja) ? false : (seen.add(e.ja), true)))
    .slice(0, TARGET_PER_GRADE)

  const withExample = out.filter((e) => e.example).length
  writeFileSync(`content/vocab/${grade}.json`, `${JSON.stringify(out, null, 2)}\n`)
  console.log(
    `✓ content/vocab/${grade}.json  ${out.length} 詞（${withExample} 個有例句，${((withExample / out.length) * 100).toFixed(0)}%）`,
  )
}
