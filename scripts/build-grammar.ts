/**
 * 從 Tatoeba 真句子產生助詞填空題。
 *
 *   pnpm content:grammar
 *
 * 【為什麼不用現成的 JLPT 文型表】
 * 找過了：授權明確、又含例句的結構化文法資料集不存在。tanos.co.uk 的文法清單
 * 只有 .doc/.pdf，其他 repo 授權不明。與其自己編日文例句（擁有者看不懂，
 * 沒人能審），不如從已經在用的 Tatoeba 語料挖題 —— 答案就是原句裡的助詞，
 * 天然可驗證。
 *
 * 【歧義的處理，這是本檔最重要的部分】
 * 助詞填空最大的陷阱是「不只一個答案對」。日文裡：
 *   - は / が 的區別牽涉主題與焦點，很多句子兩個都成立
 *   - に / へ 在移動動詞前可以互換（学校に行く＝学校へ行く）
 *   - に / で 在某些場所表現下都通
 * 出成單選題會冤枉孩子 —— 他寫對了卻被判錯。
 *
 * 所以只挖歧義較低的助詞（を・から・まで・と・の），並且明確排除
 * は・が，以及移動動詞前的 に・へ。這犧牲了覆蓋率換取正確性：
 * 寧可少出題，不要出會判錯的題。
 *
 * 【為什麼用詞法分析而不是字串比對】
 * 第一版用「這個假名只出現一次」判斷，結果挖出：
 *   こ＿Ｔシャツ      ← この 的 の（連体詞）
 *   いいお天気＿すね  ← です 的 で（助動詞）
 *   ちょっ＿ウエスト  ← ちょっと 的 と（副詞）
 * 每次抽樣都冒出新的一種，補黑名單是打地鼠 —— 沒有詞法分析就永遠有下一個漏洞。
 * 改用 kuromoji 標注詞性，只挖真正被判定為助詞的 token。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { TARGET_GRADES } from '../src/content/schema.ts'
import { makeKanjiGuard } from '../src/content/guard.ts'
import kuromoji, { type IpadicFeatures, type Tokenizer } from 'kuromoji'

export interface GrammarItem {
  /** 挖空後的句子，空格以 ＿ 表示 */
  prompt: string
  /** 原句 */
  sentence: string
  answer: string
  choices: string[]
  /** 英譯，供螢幕側欄顯示 */
  en: string | null
}

/**
 * 可以挖的助詞。刻意不含 は・が —— 它們的區別牽涉主題與焦點，
 * 大量句子兩個都講得通，出成單選題會判錯。
 */
const SAFE_PARTICLES = ['を', 'から', 'まで', 'と', 'の', 'で'] as const

/** 移動動詞：其前的 に／へ 可互換，整句跳過 */
const MOTION = /(行|来|帰|向|着|戻)[くきっるり]/

/**
 * 內容過濾。
 *
 * Tatoeba 是給成人學習者的語料，裡面有性、暴力、酒精、疾病、政治等題材。
 * 第一版沒有過濾，抽樣時抓到「先生、アソコがかゆいんです」——
 * 差一點印到六歲孩子的練習單上。
 *
 * 這份清單不可能完備。它降低風險，不消除風險 ——
 * 26000 句的語料要真正確保適齡，需要人逐句看過。
 */
const BLOCKED = [
  'アソコ', 'セックス', 'エッチ', '性的', '性行為', '妊娠', '避妊', '裸',
  '殺', '死ね', '自殺', '血まみれ', '銃', '爆弾', '戦争', 'テロ',
  '酒', 'ビール', 'ワイン', 'タバコ', '煙草', '喫煙', '麻薬', '薬物',
  'バカ', '馬鹿', 'アホ', 'くそ', 'クソ', '嫌い', '憎',
  '離婚', '浮気', '愛人', '借金', '破産', '失業', '癌', 'ガン', '病院',
  'キス', '恋人', '彼氏', '彼女と', '結婚し',
]

const RAW = 'data/raw'
const MIN_LEN = 8
const MAX_LEN = 26
const TARGET_PER_GRADE = 200

interface JmdictWord {
  sense: { examples?: { sentences: { lang: string; text: string }[] }[] }[]
}

function findJmdict(): string {
  const f = readdirSync(RAW).find((n) => n.startsWith('jmdict-examples-eng') && n.endsWith('.json'))
  if (!f) throw new Error(`找不到 ${RAW}/jmdict-examples-eng-*.json`)
  return `${RAW}/${f}`
}

const table = JSON.parse(readFileSync('content/kyoiku-by-grade.json', 'utf8')) as Record<
  string,
  string[]
>
const guard = makeKanjiGuard(table)

console.log('載入 kuromoji 詞典…')
const tokenizer = await new Promise<Tokenizer<IpadicFeatures>>((res, rej) =>
  kuromoji.builder({ dicPath: './node_modules/kuromoji/dict' }).build((e, t) => (e ? rej(e) : res(t))),
)

console.log('讀取 Tatoeba 例句…')
const dict = JSON.parse(readFileSync(findJmdict(), 'utf8')) as { words: JmdictWord[] }

/** 去重後的句子（日文, 英文） */
const sentences = new Map<string, string | null>()
for (const w of dict.words) {
  for (const s of w.sense) {
    for (const ex of s.examples ?? []) {
      const jp = ex.sentences.find((x) => x.lang === 'jpn')?.text
      if (!jp || sentences.has(jp)) continue
      sentences.set(jp, ex.sentences.find((x) => x.lang === 'eng')?.text ?? null)
    }
  }
}
console.log(`  ${sentences.size} 個不重複句子`)

function arrange(answer: string, seed: number): string[] {
  const wrong = SAFE_PARTICLES.filter((p) => p !== answer).slice(0, 3)
  const all = [answer, ...wrong]
  const at = seed % all.length
  const out = all.filter((x) => x !== answer)
  out.splice(at, 0, answer)
  return out
}

mkdirSync('content/grammar', { recursive: true })

for (const grade of TARGET_GRADES) {
  if (!existsSync(`content/kanji/${grade}.json`)) continue

  const items: GrammarItem[] = []
  let seed = 0

  for (const [jp, en] of sentences) {
    if (jp.length < MIN_LEN || jp.length > MAX_LEN) continue
    if (!guard.check(jp, grade).ok) continue
    if (MOTION.test(jp)) continue

    if (BLOCKED.some((b) => jp.includes(b))) continue

    // 詞法分析後才挖：只有被判定為助詞、且屬於格助詞／連体化／副助詞的 token 才算。
    // 終助詞（ね・よ）與接續助詞（て）排除 —— 那些不是這裡要練的東西。
    const tokens = tokenizer.tokenize(jp)
    const candidates = tokens.filter(
      (t: IpadicFeatures, i: number) =>
        t.pos === '助詞' &&
        ['格助詞', '連体化', '副助詞'].includes(t.pos_detail_1) &&
        (SAFE_PARTICLES as readonly string[]).includes(t.surface_form) &&
        i > 0 &&
        i < tokens.length - 2 &&
        // 助詞前面必須是名詞。kuromoji 對固定語句偶爾會斷錯詞
        // （「おつかれさまでした」被切出一個 まで），這道約束擋掉那類誤判。
        tokens[i - 1]!.pos === '名詞' &&
        // 單個平假名的「名詞」幾乎必然是斷詞失誤
        //（「おつかれさまでした」被切出 さ[名詞] + まで[助詞]）
        !/^[\u3040-\u309F]$/.test(tokens[i - 1]!.surface_form) &&
        // 同一個助詞在句中只出現一次，否則挖掉哪個都可能有歧義
        tokens.filter((x: IpadicFeatures) => x.surface_form === t.surface_form && x.pos === '助詞').length === 1,
    )
    if (candidates.length === 0) continue

    const target = candidates[0]!.surface_form
    const at = tokens
      .slice(0, tokens.indexOf(candidates[0]!))
      .reduce((n: number, t: IpadicFeatures) => n + t.surface_form.length, 0)

    items.push({
      prompt: `${jp.slice(0, at)}＿${jp.slice(at + target!.length)}`,
      sentence: jp,
      answer: target!,
      choices: arrange(target!, seed++),
      en,
    })

    if (items.length >= TARGET_PER_GRADE) break
  }

  writeFileSync(`content/grammar/${grade}.json`, `${JSON.stringify(items, null, 2)}\n`)
  console.log(`✓ content/grammar/${grade}.json  ${items.length} 題`)
}
