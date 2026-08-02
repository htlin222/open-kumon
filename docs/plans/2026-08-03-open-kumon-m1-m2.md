# open-kumon M1–M2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立 content-pipeline（把公開漢字資料轉成可校對的 JSON），並做出第一種練習單版型（漢字回，表＋裏），且讓「字夠大、書寫區乾淨、不爆碳粉」成為會讓 build 失敗的自動檢查。

**Architecture:** 兩個互不依賴的層。`scripts/` 是 build-time pipeline，只在 Node 跑，產出 `content/*.json` 進 git 供人工校對；`src/` 是 Vite + React SPA，只讀 JSON，離線可用。兩層之間唯一的介面是 JSON schema，由 zod 定義並雙向驗證。

**Tech Stack:** pnpm · TypeScript · Vite · React 19 · @primer/react · vitest · @playwright/test · zod · kuroshiro · japanese · openmoji · @fontsource/klee-one

**設計文件：** `docs/plans/2026-08-03-open-kumon-design.md`（先讀）

---

## 給執行者的前提

你可能沒碰過日文教材。三個必須知道的概念：

- **学年別漢字配当表** — 日本文部科学省規定的「幾年級學哪些漢字」清單。1–6 年共 1026 字。**現行版本是令和2年度（2020）實施的**，1年80／2年160／3年200／4年202／5年193／6年191。網路上多數資料集（含 KANJIDIC2、kanjiapi.dev）用的是舊版（4年200／5年185／6年181，共1006）。這個差異是本計畫 Task 2 的全部重點。
- **音読み／訓読み** — 同一個漢字有多種讀法。中文母語的孩子看得懂字形，卡的是讀音，所以讀音資料是本專案的核心欄位。
- **なぞり書き** — 淡灰色的範字，讓孩子照著描。用 KanjiVG 的筆順路徑產生。

**紀律**：每個 Task 都是 紅（測試失敗）→ 綠（最小實作）→ commit。不要一次寫完再測。

---

## Task 0: 專案骨架

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `.node-version`

**Step 1: 初始化**

```bash
cd /Users/htlin/open-kumon
pnpm init
pnpm add react react-dom @primer/react styled-components
pnpm add @tabler/icons-react @phosphor-icons/react lucide-react
pnpm add @fontsource/klee-one
pnpm add -D typescript @types/react @types/react-dom @types/node
pnpm add -D vite @vitejs/plugin-react vitest
pnpm add -D @playwright/test pngjs @types/pngjs
pnpm add -D zod tsx
pnpm add -D kuroshiro kuroshiro-analyzer-kuromoji japanese openmoji
```

注意：`kuroshiro`、`japanese`、`openmoji` 刻意放 **devDependencies** — 它們只在 build script 用，絕不能進前端 bundle（kuromoji 字典十幾 MB）。

**Step 2: 寫 `.gitignore`**

```
node_modules/
dist/
.wrangler/
audits/*.actual.png
data/raw/
.env
.DS_Store
```

`data/raw/` 是下載的原始資料（KANJIDIC2、KanjiVG），不進 git；`content/` 的產出**要**進 git。

**Step 3: `package.json` scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "data:fetch": "tsx scripts/fetch-sources.ts",
    "content:build": "tsx scripts/build-content.ts",
    "content:verify": "tsx scripts/verify-content.ts",
    "audit:sheets": "playwright test tests/audit"
  }
}
```

**Step 4: 驗證**

Run: `pnpm test`
Expected: `No test files found` — 沒有錯誤即可。

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold open-kumon (vite + react + primer + vitest + playwright)"
```

---

# M1 — content-pipeline

## Task 1: 配当表的 schema 與計數不變式

先定義「正確」長什麼樣，再去取資料。

**Files:**
- Create: `src/content/schema.ts`
- Test: `tests/unit/schema.test.ts`

**Step 1: 寫失敗的測試**

`tests/unit/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GRADE_KANJI_COUNTS, KanjiEntrySchema } from '../../src/content/schema'

describe('学年別漢字配当表（令和2年度版）', () => {
  it('各年級字數符合文部科学省規定', () => {
    expect(GRADE_KANJI_COUNTS).toEqual({ 1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191 })
  })

  it('1–5 年合計 835 字', () => {
    const total = [1, 2, 3, 4, 5]
      .reduce((s, g) => s + GRADE_KANJI_COUNTS[g as 1 | 2 | 3 | 4 | 5], 0)
    expect(total).toBe(835)
  })
})

describe('KanjiEntrySchema', () => {
  it('接受一筆完整資料', () => {
    const ok = KanjiEntrySchema.safeParse({
      kanji: '花', grade: 1, strokes: 7,
      on: ['カ'], kun: ['はな'],
      meaningZh: '花', kanjivgId: '082b1', openmoji: '1F337',
    })
    expect(ok.success).toBe(true)
  })

  it('拒絕沒有任何讀音的字', () => {
    const bad = KanjiEntrySchema.safeParse({
      kanji: '花', grade: 1, strokes: 7,
      on: [], kun: [], meaningZh: '花', kanjivgId: '082b1',
    })
    expect(bad.success).toBe(false)
  })

  it('拒絕超出 1–6 的年級', () => {
    const bad = KanjiEntrySchema.safeParse({
      kanji: '花', grade: 7, strokes: 7,
      on: ['カ'], kun: [], meaningZh: '花', kanjivgId: '082b1',
    })
    expect(bad.success).toBe(false)
  })
})
```

**Step 2: 跑測試確認失敗**

Run: `pnpm vitest run tests/unit/schema.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/content/schema"`

**Step 3: 最小實作**

`src/content/schema.ts`:

```ts
import { z } from 'zod'

export const GRADE_KANJI_COUNTS = {
  1: 80, 2: 160, 3: 200, 4: 202, 5: 193, 6: 191,
} as const

export type Grade = keyof typeof GRADE_KANJI_COUNTS

export const KanjiEntrySchema = z
  .object({
    kanji: z.string().length(1),
    grade: z.number().int().min(1).max(6),
    strokes: z.number().int().positive(),
    on: z.array(z.string()),
    kun: z.array(z.string()),
    meaningZh: z.string().min(1),
    kanjivgId: z.string().regex(/^[0-9a-f]{5}$/),
    openmoji: z.string().optional(),
  })
  .refine((e) => e.on.length + e.kun.length > 0, {
    message: '至少要有一個音読み或訓読み',
  })

export type KanjiEntry = z.infer<typeof KanjiEntrySchema>
```

**Step 4: 跑測試確認通過**

Run: `pnpm vitest run tests/unit/schema.test.ts`
Expected: PASS（4 passed）

**Step 5: Commit**

```bash
git add src/content/schema.ts tests/unit/schema.test.ts
git commit -m "feat(content): define kanji schema and 2020 grade-count invariant"
```

---

## Task 2: 取得現行配当表（新舊版差異的核心）

**Files:**
- Create: `scripts/fetch-sources.ts`
- Create: `src/content/kyoiku-revision-2020.ts`
- Test: `tests/unit/kyoiku-table.test.ts`

### 背景（務必讀完再動手）

kanjiapi.dev 的 `grade` 欄位來自 KANJIDIC2，是**舊版**配当表。實測結果：

| 年級 | kanjiapi（舊） | 現行（令和2年度） | 差 |
|---|---|---|---|
| 1 | 80 | 80 | 0 |
| 2 | 160 | 160 | 0 |
| 3 | 200 | 200 | 0 |
| 4 | 200 | 202 | +2 |
| 5 | 185 | 193 | +8 |
| 6 | 181 | 191 | +10 |

差異來源：2020 年把 20 個**都道府県漢字**（茨・媛・岡・潟・岐・熊・香・佐・埼・崎・滋・鹿・縄・井・沖・栃・奈・梨・阪・阜）加進 4 年，同時把部分原 4 年字上移 5 年、原 5 年字上移 6 年。

**做法**：舊表當底，套一份「改訂 patch」得到新表。patch 內容必須查證，不能憑印象填。

### ✅ 已查證（2026-08-03）

移動清單已對照 <https://kanji.jitenon.jp/info/1> 填入並三向驗算通過：

| 年級 | 舊 | 加入 | 移出 | 移入 | = 新 | 官方 |
|---|---|---|---|---|---|---|
| 4 | 200 | +20 都道府県 | −21（→5）−2（→6） | +4（5→4）+1（6→4） | **202** | 202 ✓ |
| 5 | 185 | — | −9（→6）−4（→4） | +21（4→5） | **193** | 193 ✓ |
| 6 | 181 | — | −1（→4） | +9（5→6）+2（4→6） | **191** | 191 ✓ |

- 4→5（21字）：囲紀喜救型航告殺士史象賞貯停堂得毒費粉脈歴
- 4→6（2字）：胃腸
- 5→6（9字）：恩券承舌銭退敵俵預
- 5→4（4字）：賀群徳富
- 6→4（1字）：城

**陷阱記錄**：網路上常見的說法是「5→6 移動 11 字（含胃・腸）」。那是錯的 —— 胃・腸 是從 **4 年**移到 6 年，不是 5 年。照那個版本填，5 年級會算出 195 而不是 193。三個年級同時驗算才抓得出來。

**不要為了讓測試變綠而去改 `GRADE_KANJI_COUNTS`**；那組數字是文部科学省定的，是事實不是設定。

**Step 1: 寫失敗的測試**

`tests/unit/kyoiku-table.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { GRADE_KANJI_COUNTS } from '../../src/content/schema'

const PATH = 'data/raw/kyoiku-by-grade.json'

describe('現行配当表產出', () => {
  it('資料檔存在（先跑 pnpm data:fetch）', () => {
    expect(existsSync(PATH)).toBe(true)
  })

  it('每個年級字數正確', () => {
    const table: Record<string, string[]> = JSON.parse(readFileSync(PATH, 'utf8'))
    for (const [g, expected] of Object.entries(GRADE_KANJI_COUNTS)) {
      expect(table[g]?.length, `${g}年級`).toBe(expected)
    }
  })

  it('沒有任何字重複出現在兩個年級', () => {
    const table: Record<string, string[]> = JSON.parse(readFileSync(PATH, 'utf8'))
    const all = Object.values(table).flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('20 個都道府県漢字都在 4 年級', () => {
    const table: Record<string, string[]> = JSON.parse(readFileSync(PATH, 'utf8'))
    const pref = [...'茨媛岡潟岐熊香佐埼崎滋鹿縄井沖栃奈梨阪阜']
    for (const k of pref) expect(table['4'], k).toContain(k)
  })
})
```

**Step 2: 跑測試確認失敗**

Run: `pnpm vitest run tests/unit/kyoiku-table.test.ts`
Expected: FAIL — 檔案不存在

**Step 3: 實作 patch 與 fetch script**

`src/content/kyoiku-revision-2020.ts`:

```ts
/**
 * 令和2年度（2020）実施の学年別漢字配当表 改訂 patch。
 * 舊表（KANJIDIC2 / kanjiapi.dev）→ 現行表。
 *
 * ⚠️ MOVED 需對照文部科学省「学年別漢字配当表」逐字核對後填入。
 *    驗收條件 = tests/unit/kyoiku-table.test.ts 的計數測試轉綠。
 */

/** 中学以上 → 小4 新加入的 20 個都道府県漢字 */
export const ADDED_TO_G4 = [...'茨媛岡潟岐熊香佐埼崎滋鹿縄井沖栃奈梨阪阜'] as const

/** 年級間的移動：{ kanji, from, to } */
export const MOVED: ReadonlyArray<{ kanji: string; from: number; to: number }> = [
  // TODO(查證後填入)：4年→5年 18 字、5年→6年 10 字
]
```

`scripts/fetch-sources.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { ADDED_TO_G4, MOVED } from '../src/content/kyoiku-revision-2020.js'

const RAW = 'data/raw'
mkdirSync(RAW, { recursive: true })

async function fetchOldTable(): Promise<Record<string, string[]>> {
  const table: Record<string, string[]> = {}
  for (const g of [1, 2, 3, 4, 5, 6]) {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/grade-${g}`)
    if (!res.ok) throw new Error(`kanjiapi grade-${g}: HTTP ${res.status}`)
    table[String(g)] = await res.json()
    console.log(`  舊表 ${g}年: ${table[String(g)].length} 字`)
  }
  return table
}

function applyRevision(old: Record<string, string[]>): Record<string, string[]> {
  const next: Record<string, string[]> = Object.fromEntries(
    Object.entries(old).map(([g, list]) => [g, [...list]]),
  )
  for (const { kanji, from, to } of MOVED) {
    const src = next[String(from)]
    const i = src.indexOf(kanji)
    if (i === -1) throw new Error(`MOVED: ${kanji} 不在 ${from} 年級，patch 有誤`)
    src.splice(i, 1)
    next[String(to)].push(kanji)
  }
  for (const k of ADDED_TO_G4) {
    if (Object.values(next).flat().includes(k)) {
      throw new Error(`ADDED_TO_G4: ${k} 已存在於配当表，patch 有誤`)
    }
    next['4'].push(k)
  }
  return next
}

const revised = applyRevision(await fetchOldTable())
for (const [g, list] of Object.entries(revised)) console.log(`  現行 ${g}年: ${list.length} 字`)
writeFileSync(`${RAW}/kyoiku-by-grade.json`, JSON.stringify(revised, null, 2))
console.log(`✓ ${RAW}/kyoiku-by-grade.json`)
```

**Step 4: 跑並驗證**

```bash
pnpm data:fetch
pnpm vitest run tests/unit/kyoiku-table.test.ts
```

Expected（MOVED 還空著時）：計數測試 FAIL，4年 220 / 5年 185 / 6年 181。
**這是預期的紅燈。** 去查證 MOVED 並填入，重跑直到 4 個測試全綠。

**Step 5: Commit**

```bash
git add scripts/fetch-sources.ts src/content/kyoiku-revision-2020.ts tests/unit/kyoiku-table.test.ts
git commit -m "feat(content): derive current (2020) kyoiku kanji table from kanjiapi + revision patch"
```

---

## Task 3: 漢字讀音／畫數資料

**Files:**
- Modify: `scripts/fetch-sources.ts`
- Create: `scripts/build-content.ts`
- Test: `tests/unit/kanji-content.test.ts`

**Step 1: 寫失敗的測試**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { KanjiEntrySchema, GRADE_KANJI_COUNTS } from '../../src/content/schema'

describe('content/kanji/1.json', () => {
  const entries = JSON.parse(readFileSync('content/kanji/1.json', 'utf8'))

  it('字數 = 80', () => expect(entries.length).toBe(GRADE_KANJI_COUNTS[1]))

  it('每一筆都通過 schema', () => {
    for (const e of entries) {
      const r = KanjiEntrySchema.safeParse(e)
      expect(r.success, `${e.kanji}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true)
    }
  })

  it('「花」的資料正確', () => {
    const hana = entries.find((e: { kanji: string }) => e.kanji === '花')
    expect(hana).toMatchObject({ grade: 1, strokes: 7, on: ['カ'], kun: ['はな'] })
  })

  it('kanjivgId 是 unicode 補零到 5 位小寫 hex', () => {
    const hana = entries.find((e: { kanji: string }) => e.kanji === '花')
    expect(hana.kanjivgId).toBe('082b1')
  })
})
```

**Step 2: 確認失敗**

Run: `pnpm vitest run tests/unit/kanji-content.test.ts`
Expected: FAIL — `content/kanji/1.json` 不存在

**Step 3: 實作**

在 `scripts/fetch-sources.ts` 末尾加：逐字打 `https://kanjiapi.dev/v1/kanji/{字}`，存成 `data/raw/kanji-details.json`。**加 80ms 節流**，835 字約 70 秒；抓過的字跳過（可重跑）。

`scripts/build-content.ts`：

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { KanjiEntrySchema } from '../src/content/schema.js'

const table = JSON.parse(readFileSync('data/raw/kyoiku-by-grade.json', 'utf8'))
const details = JSON.parse(readFileSync('data/raw/kanji-details.json', 'utf8'))
const zh = JSON.parse(readFileSync('content/source/meanings-zh.json', 'utf8'))

const kanjivgId = (ch: string) => ch.codePointAt(0)!.toString(16).padStart(5, '0')

mkdirSync('content/kanji', { recursive: true })
for (const grade of [1, 2, 3, 4, 5] as const) {
  const entries = table[String(grade)].map((ch: string) => {
    const d = details[ch]
    if (!d) throw new Error(`缺少 ${ch} 的詳細資料，請重跑 pnpm data:fetch`)
    return KanjiEntrySchema.parse({
      kanji: ch,
      grade,
      strokes: d.stroke_count,
      on: d.on_readings ?? [],
      kun: d.kun_readings ?? [],
      meaningZh: zh[ch] ?? '',      // Task 4 補齊
      kanjivgId: kanjivgId(ch),
    })
  })
  writeFileSync(`content/kanji/${grade}.json`, JSON.stringify(entries, null, 2))
  console.log(`✓ content/kanji/${grade}.json (${entries.length})`)
}
```

**注意**：`grade` 一律以配当表為準，**不用** kanjiapi 回的 `grade`（那是舊表）。

**Step 4: 跑並驗證**

```bash
pnpm data:fetch && pnpm content:build
pnpm vitest run tests/unit/kanji-content.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ content/kanji/ tests/unit/kanji-content.test.ts
git commit -m "feat(content): build per-grade kanji json with readings and stroke counts"
```

---

## Task 4: zh-TW 釋義（build-time LLM，人工校對）

kanjiapi 的 `meanings` 是英文（`花` → "flower"）。中文釋義要生成後**進 git 供校對**。

**Files:**
- Create: `content/source/meanings-zh.json`
- Create: `scripts/gen-meanings.ts`
- Test: `tests/unit/meanings.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const zh = JSON.parse(readFileSync('content/source/meanings-zh.json', 'utf8'))
const g1: { kanji: string }[] = JSON.parse(readFileSync('content/kanji/1.json', 'utf8'))

describe('zh-TW 釋義', () => {
  it('1 年級 80 字全部有釋義', () => {
    const missing = g1.filter((e) => !zh[e.kanji]?.trim()).map((e) => e.kanji)
    expect(missing, `缺：${missing.join('')}`).toHaveLength(0)
  })

  it('釋義用繁體，且不超過 12 字', () => {
    for (const e of g1) {
      expect(zh[e.kanji].length, e.kanji).toBeLessThanOrEqual(12)
      expect(zh[e.kanji], e.kanji).not.toMatch(/[丽讲书东车东这]/) // 簡體抽樣
    }
  })
})
```

**Step 2–4**：`scripts/gen-meanings.ts` 分批（每批 40 字）呼叫 Claude，prompt 要求「繁體中文、≤12 字、針對日文語境而非中文本義」（例：`勉` 日文是「勤奮」不是「勉強」）。產出寫進 `content/source/meanings-zh.json`。**人工掃一遍再 commit。**

**Step 5: Commit**

```bash
git add content/source/meanings-zh.json scripts/gen-meanings.ts tests/unit/meanings.test.ts
git commit -m "feat(content): zh-TW glosses for grade-1 kanji (LLM-generated, hand-reviewed)"
```

---

## Task 5: KanjiVG 筆順資料

**Files:**
- Modify: `scripts/fetch-sources.ts`
- Create: `scripts/build-strokes.ts`
- Test: `tests/unit/strokes.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const strokes = JSON.parse(readFileSync('content/strokes/1.json', 'utf8'))

describe('KanjiVG 筆順', () => {
  it('「花」有 7 筆，與 strokes 欄位一致', () => {
    expect(strokes['花'].paths).toHaveLength(7)
  })

  it('每一筆都是合法 SVG path', () => {
    for (const [ch, d] of Object.entries<{ paths: string[] }>(strokes)) {
      for (const p of d.paths) expect(p, ch).toMatch(/^M[\d.,\s-]/)
    }
  })

  it('viewBox 是 KanjiVG 標準的 109×109', () => {
    expect(strokes['花'].viewBox).toBe('0 0 109 109')
  })
})
```

**Step 3: 實作**

下載 `https://github.com/KanjiVG/kanjivg/releases/latest` 的 `kanjivg-*-main.zip` 解到 `data/raw/kanjivg/`。`build-strokes.ts` 讀 `{kanjivgId}.svg`，用正則抽出 `<path ... d="..."/>` 依序存陣列（KanjiVG 的 path 順序即筆順）。**不要**把整份 SVG 存進 JSON — 只留 `d` 字串，體積差 10 倍。

**Step 5: Commit**

```bash
git add scripts/build-strokes.ts content/strokes/ tests/unit/strokes.test.ts
git commit -m "feat(content): extract stroke-order paths from KanjiVG"
```

---

## Task 6: 配当表不變式檢查器

**這是整個 pipeline 的護欄。** 任何素材（語彙、例句、短文）用到超出「該年級及以下」的漢字，就讓 build 失敗。

**Files:**
- Create: `src/content/guard.ts`
- Test: `tests/unit/guard.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect } from 'vitest'
import { makeKanjiGuard } from '../../src/content/guard'

const guard = makeKanjiGuard({ 1: [...'花山川'], 2: [...'海空'] })

describe('配当表 guard', () => {
  it('放行同級與以下的字', () => {
    expect(guard.check('花が さく', 1)).toEqual({ ok: true, violations: [] })
    expect(guard.check('海と 山', 2)).toEqual({ ok: true, violations: [] })
  })

  it('擋下超綱的字', () => {
    const r = guard.check('海が ある', 1)
    expect(r.ok).toBe(false)
    expect(r.violations).toEqual([{ kanji: '海', requiredGrade: 2 }])
  })

  it('擋下不在配当表內的字', () => {
    const r = guard.check('薔薇', 5)
    expect(r.ok).toBe(false)
    expect(r.violations).toEqual([
      { kanji: '薔', requiredGrade: null },
      { kanji: '薇', requiredGrade: null },
    ])
  })

  it('忽略かな與標點', () => {
    expect(guard.check('はな が さく。', 1).ok).toBe(true)
  })
})
```

**Step 3: 最小實作**

```ts
const KANJI_RE = /\p{Script=Han}/u

export function makeKanjiGuard(table: Record<number, string[]>) {
  const gradeOf = new Map<string, number>()
  for (const [g, list] of Object.entries(table)) {
    for (const ch of list) gradeOf.set(ch, Number(g))
  }
  return {
    check(text: string, grade: number) {
      const violations: { kanji: string; requiredGrade: number | null }[] = []
      const seen = new Set<string>()
      for (const ch of text) {
        if (!KANJI_RE.test(ch) || seen.has(ch)) continue
        seen.add(ch)
        const g = gradeOf.get(ch) ?? null
        if (g === null || g > grade) violations.push({ kanji: ch, requiredGrade: g })
      }
      return { ok: violations.length === 0, violations }
    },
  }
}
```

**Step 5: Commit**

```bash
git add src/content/guard.ts tests/unit/guard.test.ts
git commit -m "feat(content): kanji grade-level guard (build fails on out-of-scope kanji)"
```

---

## Task 7: 振假名工具（kuroshiro）

**Files:**
- Create: `scripts/lib/furigana.ts`
- Test: `tests/unit/furigana.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { toRubyTokens } from '../../scripts/lib/furigana'

describe('振假名切分', () => {
  beforeAll(async () => { await import('../../scripts/lib/furigana').then((m) => m.init()) }, 60_000)

  it('把漢字與讀音配對成 token', async () => {
    expect(await toRubyTokens('花がさく')).toEqual([
      { text: '花', ruby: 'はな' },
      { text: 'がさく', ruby: null },
    ])
  })

  it('純かな沒有 ruby', async () => {
    expect(await toRubyTokens('はな')).toEqual([{ text: 'はな', ruby: null }])
  })
})
```

`init()` 要 60 秒 timeout — kuromoji 首次載入字典很慢。

**Step 3: 實作** — 包 `kuroshiro` + `kuroshiro-analyzer-kuromoji`，`convert(text, { mode: 'furigana', to: 'hiragana' })` 後把 `<ruby>` HTML 解析成 token 陣列。**只在 script 用，不匯出到 `src/`。**

**Step 5: Commit**

```bash
git add scripts/lib/furigana.ts tests/unit/furigana.test.ts
git commit -m "feat(content): furigana tokenizer via kuroshiro (build-time only)"
```

---

## Task 8: OpenMoji 意味插圖對照

**Files:**
- Create: `content/source/openmoji-map.json`
- Create: `scripts/build-illustrations.ts`
- Test: `tests/unit/openmoji.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/source/openmoji-map.json', 'utf8'))
const g1: { kanji: string }[] = JSON.parse(readFileSync('content/kanji/1.json', 'utf8'))

describe('OpenMoji 對照', () => {
  it('1 年級具象字覆蓋率 ≥ 70%', () => {
    const hit = g1.filter((e) => map[e.kanji]).length
    expect(hit / g1.length).toBeGreaterThanOrEqual(0.7)
  })

  it('每個 code 都對得到 black 線稿檔', () => {
    for (const code of Object.values<string>(map)) {
      expect(existsSync(`public/openmoji/${code}.svg`), code).toBe(true)
    }
  })

  it('線稿 SVG 不含實心填色（碳粉預算）', () => {
    for (const code of Object.values<string>(map)) {
      const svg = readFileSync(`public/openmoji/${code}.svg`, 'utf8')
      expect(svg, code).not.toMatch(/fill="#(?!fff|FFF|none)/)
    }
  })
})
```

**Step 3: 實作** — 從 `node_modules/openmoji/black/svg/` 複製有用到的檔到 `public/openmoji/`。對照表先手工填 1 年級具象字（`日=2600 月=1F319 火=1F525 水=1F4A7 木=1F333 山=1F5FB 川=1F30A 花=1F337 犬=1F415 車=1F697 雨=1F327 目=1F441 耳=1F442 手=270B 足=1F9B6 口=1F444 人=1F9CD 田=1F33E 石=1FAA8 貝=1F41A …`），抽象字留空。

**Step 5: Commit**

```bash
git add content/source/openmoji-map.json scripts/build-illustrations.ts public/openmoji/ tests/unit/openmoji.test.ts
git commit -m "feat(content): map grade-1 kanji to OpenMoji black line-art"
```

---

# M2 — 漢字版型與列印稽核

## Task 9: A4 列印基礎與量測工具

**Files:**
- Create: `src/print/units.ts`, `src/print/print.css`
- Test: `tests/unit/units.test.ts`

**Step 1: 測試**

```ts
import { describe, it, expect } from 'vitest'
import { mm, pt, A4, SAFE_BOX } from '../../src/print/units'

describe('列印單位換算（CSS 96dpi）', () => {
  it('1mm = 3.7795px', () => expect(mm(1)).toBeCloseTo(3.7795, 3))
  it('9pt = 12px（絕對字級下限）', () => expect(pt(9)).toBeCloseTo(12, 3))
  it('A4 = 793.7 × 1122.5 px', () => {
    expect(A4.width).toBeCloseTo(793.7, 1)
    expect(A4.height).toBeCloseTo(1122.5, 1)
  })
  it('安全框 = 182 × 273mm', () => {
    expect(SAFE_BOX.width).toBeCloseTo(mm(182), 1)
    expect(SAFE_BOX.height).toBeCloseTo(mm(273), 1)
  })
})
```

**Step 3: 實作**

```ts
export const PX_PER_MM = 96 / 25.4
export const mm = (v: number) => v * PX_PER_MM
export const pt = (v: number) => (v * 96) / 72

export const A4 = { width: mm(210), height: mm(297) }
export const MARGIN = { top: mm(12), right: mm(14), bottom: mm(12), left: mm(14) }
export const SAFE_BOX = {
  x: MARGIN.left, y: MARGIN.top,
  width: A4.width - MARGIN.left - MARGIN.right,
  height: A4.height - MARGIN.top - MARGIN.bottom,
}

/** 設計文件第 5 段的尺寸下限 */
export const MIN = {
  traceGlyph: mm(22), writingCell: mm(18),
  sentencePt: 14, instructionPt: 12, annotationPt: 10, absolutePt: 9,
  clearanceMm: 5, inkCoverage: 0.08,
}
```

`src/print/print.css`：`@page { size: A4; margin: 12mm 14mm }`、`.sheet` 固定尺寸、`@media print` 隱藏 App 外殼、`-webkit-print-color-adjust: exact`。

**Step 5: Commit**

```bash
git add src/print/ tests/unit/units.test.ts
git commit -m "feat(print): A4 geometry constants and print stylesheet base"
```

---

## Task 10: マス目與なぞり元件

**Files:**
- Create: `src/components/sheet/WritingCell.tsx`, `src/components/sheet/TraceGlyph.tsx`
- Test: `tests/unit/writing-cell.test.tsx`

要點：

- `WritingCell` — 18mm 見方，十字リーダー（虛線十字輔助線，日本練習本標準），`data-write-zone` 屬性供稽核辨識。
- `TraceGlyph` — 22mm，吃 `content/strokes/{grade}.json` 的 path，`stroke: #c9c9c9`、`stroke-width: 6`、`fill: none`，可選筆順編號（Klee One，10pt）。
- 兩者都**不吃 Primer typography**。

測試用 `@testing-library/react` 驗：渲染 7 條 path、有 `data-write-zone`、寬高等於 `MIN.writingCell`。

```bash
git commit -m "feat(sheet): writing cell and stroke-order trace glyph components"
```

---

## Task 11: 漢字回版型（表＋裏）

**Files:**
- Create: `src/components/sheet/KanjiSheet.tsx`
- Create: `src/routes/preview.tsx`
- Test: `tests/unit/kanji-sheet.test.tsx`

**表**：3 個新出字 ×（意味插圖＋音訓＋なぞり×2＋空格×3）
**裏**：語彙填空 6–8 題，每題一個 `WritingCell`，附 OpenMoji 提示圖

版面規則（會被 Task 12 驗）：所有指示語 ≥12pt、例句 ≥14pt、插圖與 `data-write-zone` 保持 5mm 淨空。

`/preview?series=kanji&grade=1&unit=1` 用 `transform: scale()` 把真實 A4 DOM 縮進視窗 —— **同一份 DOM，不做第二套渲染**。

```bash
git commit -m "feat(sheet): kanji unit template (front + back) with preview route"
```

---

## Task 12: Playwright 列印稽核（六道關卡）

**這是本計畫的驗收核心。** 使用者的「字別太小」「書寫區乾淨」在這裡從口頭約定變成會擋 build 的檢查。

**Files:**
- Create: `playwright.config.ts`, `tests/audit/sheet-audit.spec.ts`, `tests/audit/helpers.ts`

**Step 1: 寫六個檢查（先全紅）**

```ts
import { test, expect } from '@playwright/test'
import { MIN, SAFE_BOX, pt } from '../../src/print/units'
import { inkCoverage } from './helpers'

const CASES = [{ series: 'kanji', grade: 1, unit: 1 }]

for (const c of CASES) {
  for (const side of ['front', 'back'] as const) {
    const name = `${c.series}-g${c.grade}-u${c.unit}-${side}`

    test.describe(name, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/preview?series=${c.series}&grade=${c.grade}&unit=${c.unit}&side=${side}&raw=1`)
        await page.emulateMedia({ media: 'print' })
        await page.evaluate(() => document.fonts.ready)
      })

      test('1. 不溢出安全框', async ({ page }) => {
        const overflow = await page.evaluate((box) => {
          const out: string[] = []
          for (const el of document.querySelectorAll('.sheet *')) {
            const r = el.getBoundingClientRect()
            if (r.width === 0) continue
            if (r.left < box.x - 0.5 || r.top < box.y - 0.5 ||
                r.right > box.x + box.width + 0.5 || r.bottom > box.y + box.height + 0.5) {
              out.push(`${el.tagName}.${el.className}`)
            }
          }
          return out
        }, SAFE_BOX)
        expect(overflow, `溢出：${overflow.join(', ')}`).toHaveLength(0)
      })

      test('2. 沒有小於 9pt 的字', async ({ page }) => {
        const tooSmall = await page.evaluate((minPx) => {
          const out: string[] = []
          for (const el of document.querySelectorAll('.sheet *')) {
            if (!el.textContent?.trim()) continue
            const px = parseFloat(getComputedStyle(el).fontSize)
            if (px < minPx - 0.01) out.push(`${el.tagName} ${px.toFixed(1)}px`)
          }
          return out
        }, pt(MIN.absolutePt))
        expect(tooSmall, `過小：${tooSmall.join(', ')}`).toHaveLength(0)
      })

      test('3. 書寫區 5mm 內淨空', async ({ page }) => {
        const collisions = await page.evaluate((buf) => {
          const zones = [...document.querySelectorAll('[data-write-zone]')].map((e) => e.getBoundingClientRect())
          const arts = [...document.querySelectorAll('[data-illustration]')].map((e) => e.getBoundingClientRect())
          const out: string[] = []
          for (const z of zones) for (const a of arts) {
            const hit = !(a.right < z.left - buf || a.left > z.right + buf ||
                          a.bottom < z.top - buf || a.top > z.bottom + buf)
            if (hit) out.push(`(${a.left.toFixed(0)},${a.top.toFixed(0)})`)
          }
          return out
        }, MIN.clearanceMm * (96 / 25.4))
        expect(collisions, `插圖侵入書寫區：${collisions.join(', ')}`).toHaveLength(0)
      })

      test('4. 碳粉覆蓋率 ≤ 8%', async ({ page }, testInfo) => {
        const png = await page.locator('.sheet').screenshot({ path: `audits/${name}.actual.png` })
        const ratio = inkCoverage(png)
        await testInfo.attach('coverage', { body: `${(ratio * 100).toFixed(2)}%`, contentType: 'text/plain' })
        expect(ratio).toBeLessThanOrEqual(MIN.inkCoverage)
      })

      test('5. 範字與格子尺寸達標', async ({ page }) => {
        const trace = page.locator('[data-trace-glyph]').first()
        expect((await trace.boundingBox())!.width).toBeGreaterThanOrEqual(MIN.traceGlyph - 0.5)
        const cell = page.locator('[data-write-zone]').first()
        expect((await cell.boundingBox())!.width).toBeGreaterThanOrEqual(MIN.writingCell - 0.5)
      })

      test('6. 視覺回歸', async ({ page }) => {
        await expect(page.locator('.sheet')).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.01 })
      })
    })
  }
}
```

`tests/audit/helpers.ts` — 用 `pngjs` 解 PNG，數非白像素（`r+g+b < 720`）比例。

`playwright.config.ts`：`use: { viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 }`、`webServer: { command: 'pnpm dev', port: 5173, reuseExistingServer: true }`、`snapshotDir: 'audits/baseline'`。

**Step 2: 跑**

```bash
pnpm exec playwright install chromium
pnpm audit:sheets
```

第一次跑：檢查 6 會因為沒有 baseline 而建立快照；檢查 1–5 應該全綠。**任何一項紅就回頭改版型，不要調閾值。**

**Step 5: Commit**

```bash
git add playwright.config.ts tests/audit/ audits/baseline/
git commit -m "test(audit): six print-fidelity gates (overflow, font-size, clearance, ink, sizing, visual)"
```

---

## Task 13: 接上 CI

**Files:** `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm content:verify      # 配当表 guard 掃全部 content/
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm audit:sheets
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: sheet-audits, path: audits/ }
```

`content:verify` 用 Task 6 的 guard 掃過 `content/` 全部素材，任何超綱字讓 CI 紅。

```bash
git commit -m "ci: run unit tests, content guard, and print audits on every push"
```

---

## M2 完成定義

- `pnpm test` 全綠
- `pnpm audit:sheets` 六道關卡全綠
- `/preview?series=kanji&grade=1&unit=1` 可預覽、可列印
- **實機驗收**：真的印出來一張，量測範字 ≥22mm、格子 ≥18mm，確認孩子看得清楚

最後一項不能省。前面五道自動檢查都是在模擬「印出來會怎樣」，只有真的印一張才知道。

---

## 已知風險

| 風險 | 處理 |
|---|---|
| MOVED patch 查不到權威來源 | 退而求其次：手動輸入現行 4／5 年級全表，測試計數仍能守住 |
| OpenMoji 對 1 年級覆蓋率不到 70% | 降到 60% 並記錄缺哪些字，之後補畫 |
| Chromium 列印與實體印表機有落差 | M2 完成定義的實機驗收就是為了抓這個 |
| kuromoji 首次載入在 CI 逾時 | 振假名在 build 產出並進 git，CI 不重跑 |
