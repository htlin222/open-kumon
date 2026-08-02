# open-kumon 設計文件

日期：2026-08-03
狀態：第 1–4 段經確認；第 5–7 段為依既有決策推導，尚未逐段確認。

---

## 0. 這是什麼

給台灣孩子用的日本小學「国語」每日練習單網站。畫面上選好，一鍵印出 A4，寫完回網站勾錯題，隔天自動出下一張。

課程骨架對齊「くもんの小学ドリル 国語」，範圍 1–5 年級。

**不做**：算数、英語、プログラミング、学力チェックテスト。

---

## 1. 已定案決策

| # | 項目 | 決定 |
|---|---|---|
| 1 | 核心定位 | 每日課表型（有進度、有連續天數、每天算出「今天該練這張」） |
| 2 | 科目範圍 | 只做国語，全系列：ひらがな・カタカナ／漢字／言葉と文のきまり／文章の読解／書き方 |
| 3 | 年級範圍 | 1–5 年（漢字 80+160+200+202+193 = 835 字） |
| 4 | 內容產生 | 全 build-time 預生成，進 git，可人工校對。LLM 不在執行路徑上 |
| 5 | 每日單位 | 主線一本 + 階段解鎖（同時只跑 1–2 條 track） |
| 6 | 每日份量 | 1 張 A4 雙面（表＋裏），約 20 分鐘 |
| 7 | 語言分工 | **紙面 100% 日文；中文全在網站畫面上** |
| 8 | 批改 | 網站上勾選錯題 → 進錯題本 → 間隔複習 |
| 9 | 書寫方向 | 全橫書（資料層與版型解耦，未來可加縦書き） |
| 10 | 字型 | Klee One（OFL，教科書体風）+ KanjiVG（CC BY-SA，筆順／なぞり） |
| 11 | 意味插圖 | OpenMoji（CC BY-SA 4.0），採用官方 black 線稿版 |
| 12 | 人物插圖 | Open Peeps + Humaaans，**僅螢幕**與紙面陪伴角色（線稿化） |
| 13 | Icon | Tabler（App 外殼）／Phosphor duotone・fill（孩子看的大圖示）／Lucide（補缺） |
| 14 | UI | Primer React |
| 15 | 程度檢定 | 規則式自適應快篩；Workers AI 只負責把結果寫成 zh-TW 說明 |
| 16 | 技術棧 | Vite + React + Primer React → Cloudflare Pages；Worker 掛 /api |
| 17 | 存取控制 | cf-gate（Cloudflare Access），並直接拿 Access 的 email JWT 當身分 |
| 18 | 進度儲存 | D1（身分由 Access 提供，不寫登入程式碼） |
| 19 | 視覺驗證 | Playwright 列印稽核納入 CI 關卡 |

---

## 2. 系統架構

```
[build 時]  content-pipeline（Node script，CI 執行）
              ├─ 学年別漢字配当表（1–5年 = 835 字）
              ├─ KANJIDIC2      → 音読／訓読／画数／中文義
              ├─ KanjiVG        → 筆順 SVG、なぞり路徑
              ├─ kuroshiro + japanese → 送假名、振假名、詞性
              ├─ OpenMoji black → 意味插圖對照表
              └─ Claude 批次生成 例句／短文／文法題（受配当表嚴格約束）
                        ↓
                  content/*.json（進 git，可人工校對）

[執行時]
  Cloudflare Access（cf-gate）
        ↓ email JWT
  Cloudflare Pages ──── React SPA（靜態）
       │                 讀 content/*.json；課表演算、排版、列印全在前端
       │
       └── Worker /api
             ├─ D1          孩子檔案、每日完成紀錄、錯題本
             └─ Workers AI  僅：程度檢定結果的 zh-TW 解讀
```

### 三個關鍵性質

**LLM 不在執行路徑上。** 所有日文內容在 build 時固定成 JSON 並可人工校對。孩子看到的每個字都被審過，不會有小模型現場亂寫漢字或超綱用字。

**kuroshiro / japanese 只活在 build script。** kuromoji 字典十幾 MB，絕不進 bundle。前端拿到的是算好的純資料。

**離線可用。** 課表演算、排版、列印全在前端。斷網照樣印今天這張；只有進度同步與程度檢定要連線。

**cf-gate 兼作身分。** Access 認證後把 email 塞進 JWT，Worker 直接當 user key。零登入程式碼。

---

## 3. 紙面插圖系統

紙上沒有中文，**圖就得扛起「這個字什麼意思」的工作**。插圖是功能，不是裝飾。

### 三層

**① 意味插圖（功能性）**
綁在單字／例句旁，傳達語意。來源 OpenMoji black。純線稿、無填色、12–16mm。放該詞正上方或右側。

**② 陪伴角色（情感性）**
Humaaans / Open Peeps 人物，出現在頁首頁尾與頁緣。每回換造型，做成可蒐集感。線稿化，只保留輪廓與少量 20% 灰。

**③ 背景底紋（氣氛）**
極淡（5–8% 灰）重複紋樣或人物剪影，只鋪頁緣與大片留白。

### 三條硬規則（違反則 build 失敗）

- **書寫區絕對淨空** — マス目、答案線、なぞり字周圍 5mm 內不得有任何圖。
- **碳粉預算** — 單頁非文字墨水覆蓋率 ≤ 8%。原生彩色實心填充一律於 build 時轉線稿。
- **黑白優先** — 假設印表機是黑白雷射。彩色是加分，不是前提。

### 授權標示

OpenMoji（CC BY-SA 4.0）、KanjiVG（CC BY-SA 3.0）、Klee One（OFL）、Humaaans / Open Peeps。
網站 footer 一行 + `/credits` 頁完整列出；紙面頁尾 6pt 小字。

---

## 4. 內容資料模型與課表引擎

### 資料模型

```
content/
  kanji/{1..5}.json      字、年級、音訓、画数、KanjiVG id、zh-TW 義、OpenMoji code
  words/{1..5}.json      熟語語彙：表記、読み、義、含哪些字、OpenMoji
  sentences/{1..5}.json  例句：本文、振假名、中譯、用到的字
  grammar/{1..5}.json    言葉と文のきまり 題目（助詞・語順・敬体…）
  passages/{1..5}.json   読解短文 + 設問
  units/{series}/{grade}.json   「回」的定義：第 N 回 = 哪些素材 + 用哪個版型
```

**生成期不變式**（build script 強制檢查）：任何素材用到的漢字，不得超出「該年級 + 以下所有年級」的配当表。違反則 build 失敗。

### 引擎：兩股力量

**前進** — 五個系列各是一條 track，同時只有 1–2 條在跑：

```
ひらがな・カタカナ
      ↓（かな 讀寫達標）
   漢字（主線，持續跑）
      ├─→ 書き方（跟著漢字走，每隔幾回插一張）
      ↓（累積字數達門檻）
言葉と文のきまり
      ↓（跑一段 + 語彙量達門檻）
   文章の読解
```

**回收** — 勾錯的字進錯題本，走 **3 / 7 / 21 / 60 天** 四階間隔。答對升階，答錯退回上一階。

### 每日判斷

```
到期複習字數 ≥ 8  →  出「複習回」（純粹重練那些字）
否則              →  出主線下一回，並把 1–3 個到期字混進去
```

孩子不會發現自己在複習 —— 複習混在正課裡。只有積太多才會出現整張複習卷。

---

## 5. 版面規格與列印／視覺稽核

### 版面

一回 = 兩頁。表 = 新出字導入與なぞり；裏 = 應用與檢查。

```css
@page { size: A4; margin: 12mm 14mm; }   /* 安全框 182 × 273mm */
```

### 尺寸下限（可驗證規則）

| 元素 | 最小值 |
|---|---|
| なぞり範字 | 22mm 見方 |
| マス目書寫格 | 18mm 見方 |
| 例句 | 14pt |
| 指示語 | 12pt |
| 注記／振假名 | 10pt |
| **絕對下限** | **9pt（任何元素）** |

### 預覽 = 同一份 DOM

不做第二套渲染。畫面上就是真實 A4 DOM 用 `transform: scale()` 縮進視窗；print stylesheet 只切版面不改內容。所見即所印，因為本來就是同一個東西。列印走瀏覽器原生 `window.print()`，不自產 PDF。

### 排版與 Primer 的界線

| 區域 | 規則 |
|---|---|
| App 外殼（導覽、卡片、按鈕、進度） | Primer 原生尺度 |
| 練習單本體 | **完全不吃 Primer typography**，另一套 print scale |

### Playwright 稽核（CI 關卡）

`pnpm audit:sheets` 對每種版型 × 每個年級跑：

1. `emulateMedia({ media: 'print' })` → `page.pdf({ format: 'A4' })`
2. **溢出檢查** — 元素 bounding box 超出安全框 → fail
3. **字級掃描** — computed font-size < 9pt → fail
4. **書寫區淨空** — 格子與插圖 bounding box 相交（含 5mm 緩衝）→ fail
5. **碳粉預算** — PDF 轉點陣，非白像素比 > 8% → fail
6. **視覺回歸** — 與 baseline PNG 比對，超閾值需人工確認才更新 baseline

產物存 `audits/{template}-{grade}-{front|back}.png`。

---

## 6. 程度檢定（未逐段確認）

**定位**：判定起始位置，不是考試。3–5 分鐘結束。

**語言**：指示語一律 zh-TW，題目本體才是日文 —— 否則變成在考「看不看得懂題目」。

**流程**（規則式自適應，題庫固定）：

1. かな 讀（8 題）→ 判定是否需從 ひらがな・カタカナ 開始
2. 漢字讀音（自適應，從 1 年往上二分搜尋，約 8 題）→ 定位年級
3. 助詞・語順（4 題）→ 判定「言葉と文のきまり」是否可解鎖

**Workers AI 的唯一職責**：把規則算出的結果寫成一段 zh-TW 說明（強弱項、建議起點、理由）給家長看。判定本身不經 AI，可重現。

---

## 7. 進度儲存與部署（未逐段確認）

### D1 schema（草案）

```sql
children   (id, owner_email, name, created_at)
progress   (child_id, series, grade, unit_no, completed_at)
mistakes   (child_id, item_type, item_key, stage, due_at, updated_at)
placement  (child_id, taken_at, result_json)
```

`owner_email` 來自 Cloudflare Access JWT。

### 部署

- 前端：Cloudflare Pages（`cf-page` skill）
- API：Worker（D1 binding + Workers AI binding）
- 存取控制：Cloudflare Access（`cf-gate` skill），allow-email 白名單
- 前端離線：localStorage 作為 D1 的快取層，斷網可讀可寫，回線補送

---

## 8. 里程碑（未逐段確認）

| # | 產出 | 完成定義 |
|---|---|---|
| M1 | content-pipeline 骨架 | 1 年級 80 字的 kanji/words/sentences JSON 產出，配当表不變式檢查通過 |
| M2 | 漢字版型 + 列印稽核 | 一回（表裏）可預覽可列印，6 項 Playwright 稽核全綠 |
| M3 | 課表引擎 + 錯題本 | 前端可算出「今天這張」，勾錯題後隔日正確反映（localStorage） |
| M4 | 其餘四系列版型 | 5 種版型全部通過稽核 |
| M5 | 2–5 年級內容 | 835 字全量產出並抽校 |
| M6 | 程度檢定 | 規則判定 + Workers AI 解讀 |
| M7 | 上線 | Pages + Worker + D1 + Access 全通，實機列印驗收 |

---

## 9. 待補資訊

- 孩子人數、名字、年齡（設計已支援 N 位，僅影響初始資料）
- 實際印表機型號與是否支援自動雙面（影響「翻面提示」的呈現）
- build 時生成例句／短文所用的 Claude API 途徑與預算
