# open-kumon M3：課表引擎與錯題本

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓網站每天算出「今天這張」，寫完勾錯題，錯的字自動排進未來的複習 —— 把翻頁的產生器變成有進度的每日課表。

**Architecture:** 三層純函式 + 一層儲存。SRS 與課表選擇是無副作用的純函式（時間一律由外部傳入，絕不在裡面呼叫 `Date.now()`），儲存層只負責 localStorage 的讀寫與版本遷移，React 只是這兩層的顯示。D1 同步留到 M4；先讓它離線就能跑完整循環。

**Tech Stack:** TypeScript · zod · vitest · React

**前置：** M1–M2 已完成（`content/kanji/1.json`、`content/strokes/1.json`、漢字版型、六道列印稽核）

---

## 為什麼先做這個，而不是先補 755 字釋義

1 年級 80 字 = 27 回，每天一回就是將近一個月。內容不是瓶頸，**「每天知道該做哪一張」才是**。而且錯題本要先存在，之後補進來的每個年級才會自動獲得複習能力 —— 反過來做的話，前一個月的錯題全部漏掉。

---

## 設計決策（沿用設計文件，此處只記可驗證的形式）

| 項目 | 規則 |
|---|---|
| 複習間隔 | 3 / 7 / 21 / 60 天，四階 |
| 答對 | 升一階；第四階答對即畢業，不再排 |
| 答錯 | 退一階（已在第一階則留在第一階），重新計時 |
| 出複習卷的門檻 | 到期字數 ≥ 8 |
| 混入正課的到期字 | 最多 3 個 |
| 連續天數 | 今天或昨天有完成紀錄才算存活 |
| 時間 | 一律以本地日期（YYYY-MM-DD）計算，不用時間戳 —— 跨時區與日光節約時間都不該影響「今天該練哪張」 |

---

## Task 1: 日期工具

時間是這套引擎最容易出錯的地方。先把它隔離成可測試的純函式。

**Files:**
- Create: `src/curriculum/day.ts`
- Test: `tests/unit/day.test.ts`

**Step 1: 寫失敗的測試**

```ts
import { describe, it, expect } from 'vitest'
import { toDayKey, addDays, daysBetween, isConsecutive } from '../../src/curriculum/day'

describe('日期工具', () => {
  it('把 Date 轉成本地日期字串', () => {
    expect(toDayKey(new Date(2026, 7, 3, 23, 59))).toBe('2026-08-03')
  })

  it('用本地時間而非 UTC（跨日的關鍵）', () => {
    // 台灣時間深夜 23:00 仍是同一天，用 toISOString 會變成隔天
    const late = new Date(2026, 7, 3, 23, 0)
    expect(toDayKey(late)).toBe('2026-08-03')
  })

  it('addDays 跨月正確', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
  })

  it('addDays 跨年正確', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('daysBetween 計算天數差', () => {
    expect(daysBetween('2026-08-01', '2026-08-04')).toBe(3)
    expect(daysBetween('2026-08-04', '2026-08-01')).toBe(-3)
    expect(daysBetween('2026-08-01', '2026-08-01')).toBe(0)
  })

  it('isConsecutive：今天或昨天都算連續存活', () => {
    expect(isConsecutive('2026-08-03', '2026-08-03')).toBe(true)
    expect(isConsecutive('2026-08-02', '2026-08-03')).toBe(true)
    expect(isConsecutive('2026-08-01', '2026-08-03')).toBe(false)
  })
})
```

**Step 2–4:** 實作 → 測試轉綠。

**Step 5: Commit**

```bash
git commit -m "feat(curriculum): local-date helpers for the daily engine"
```

---

## Task 2: 間隔複習（SRS）

**Files:**
- Create: `src/curriculum/srs.ts`
- Test: `tests/unit/srs.test.ts`

要測的行為：

- 新錯的字 → stage 0，3 天後到期
- 答對 → 升階，間隔拉長（3→7→21→60）
- 第四階答對 → 畢業（回傳 `null`，不再排入）
- 答錯 → 退一階並重新計時；已在第一階則留在第一階
- `dueOn <= today` 才算到期
- 同一個字重複答錯不會產生兩筆

**Step 5: Commit**

```bash
git commit -m "feat(curriculum): 3/7/21/60-day spaced repetition for missed kanji"
```

---

## Task 3: 每日課表選擇

**Files:**
- Create: `src/curriculum/schedule.ts`
- Test: `tests/unit/schedule.test.ts`

```ts
export type Assignment =
  | { kind: 'review'; grade: number; kanji: string[] }
  | { kind: 'lesson'; grade: number; unitNo: number; injected: string[] }
  | { kind: 'finished' }
```

要測的行為：

- 到期 ≥ 8 個 → 出 `review`
- 到期 < 8 → 出 `lesson`，並混入最多 3 個到期字
- 沒有到期字 → `lesson` 且 `injected` 為空
- 主線做完 → `finished`
- **同一天重複呼叫回傳同一份**（不能因為多開一個分頁就跳題）

最後一項最重要 —— 它保證「今天這張」是穩定的。

**Step 5: Commit**

```bash
git commit -m "feat(curriculum): daily assignment selection with review injection"
```

---

## Task 4: 進度儲存（localStorage）

**Files:**
- Create: `src/storage/schema.ts`, `src/storage/store.ts`
- Test: `tests/unit/store.test.ts`

用 zod 定義 schema 並在讀取時驗證 —— localStorage 的內容是使用者可以隨手改壞的，壞資料不該讓整個網站白畫面。

- 支援多個孩子，各自一條進度
- 損毀或版本不符 → 回退到初始狀態並保留備份，不丟例外
- 匯出／匯入 JSON（設計文件裡 localStorage 方案的補救措施）

**Step 5: Commit**

```bash
git commit -m "feat(storage): validated localStorage progress with export/import"
```

---

## Task 5: 接上 UI

**Files:**
- Create: `src/hooks/useProgress.ts`, `src/components/TodayPanel.tsx`, `src/components/MistakeChecklist.tsx`
- Modify: `src/App.tsx`

- 首頁預設顯示「今天這張」，而不是第 1 回
- 列印後出現「寫完了」→ 展開這一回的每個字 → 勾錯的 → 送出
- 顯示連續天數與本回進度
- 仍保留自由翻頁（`?unit=` 照舊可用）

**Step 5: Commit**

```bash
git commit -m "feat(ui): today's sheet, mistake checklist and streak"
```

---

## Task 6: 稽核與部署

- `pnpm audit:sheets` 六道關卡仍需全綠（版型沒動，應該不受影響）
- 新增一個稽核情境：複習卷（`kind: 'review'`）的版型
- 部署並實際點一輪：列印 → 勾錯 → 隔天確認錯字有回來

---

## 不在這一輪做

- D1 同步（M4）
- 程度檢定（M5）
- 2–5 年級釋義
- Open Peeps / Humaaans 插圖

留著是為了讓這一輪能收斂。每一項都比「讓每天有一張正確的紙」次要。
