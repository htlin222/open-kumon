# open-kumon

[![CI](https://github.com/htlin222/open-kumon/actions/workflows/ci.yml/badge.svg)](https://github.com/htlin222/open-kumon/actions/workflows/ci.yml)

給台灣孩子的日本小學「国語」每日練習單。畫面上選好，一鍵印出 A4，寫完回網站勾錯題，隔天自動出下一張。

**線上**：<https://open-kumon.pages.dev>（Cloudflare Access 保護，僅限白名單 email）

課程骨架對齊「くもんの小学ドリル 国語」，範圍 1–5 年級，**835 字全數建構完成**（279 回，約一年半的每日份量）。

> 這是個人專案，與 くもん出版 / 公文教育研究会 無任何關係。

---

## 為什麼做這個

市售的日本小學練習本預設孩子已有母語口說詞彙量。台灣孩子剛學完 50 音時，日文詞彙量約等於日本三歲，直接拿小学ドリル 會卡在「看不懂題目」而不是「不會寫」。

這個站處理那個落差：

- **紙面 100% 日文** — 跟原版一樣乾淨，字大、格子大，不依賴中文
- **中文全在螢幕上** — 指示語中譯、音訓、例句中譯，孩子卡住時看旁邊
- **圖扛起語意** — 紙上沒中文，所以每個具象字配一張線稿小圖。「花」旁邊一朵花，勝過任何中譯

## 設計取向

| | |
|---|---|
| 每日單位 | 1 張 A4 雙面，約 20 分鐘 |
| 進度 | 主線一本 + 階段解鎖，同時只跑 1–2 條 track |
| 複習 | 勾錯題 → 3 / 7 / 21 / 60 天間隔 → 混進正課，孩子不會發現自己在複習 |
| LLM | **不在執行路徑上**。所有日文內容 build-time 生成、進 git、可人工校對 |
| 離線 | 課表演算、排版、列印全在前端。斷網照樣印今天這張 |

## 技術

Vite · React · @primer/react · Cloudflare Pages · Workers · D1

Build-time pipeline：KANJIDIC2 / kanjiapi.dev（讀音）· KanjiVG（筆順）· kuroshiro（振假名）· OpenMoji（意味插圖）

### 印出來的東西會被自動檢查

「字別太小」「書寫區乾淨」不是口頭約定，是 CI 關卡。每種版型 × 每個年級都跑六道 Playwright 檢查：

1. 元素不得溢出 A4 安全框（182×273mm）
2. 沒有小於 9pt 的字
3. 插圖與書寫區保持 5mm 淨空
4. 單頁碳粉覆蓋率 ≤ 8%
5. なぞり範字 ≥ 22mm、マス目 ≥ 18mm
6. 視覺回歸比對

## 目前進度

| | 狀態 |
|---|---|
| 学年別漢字配当表（令和2年度・835 字） | ✅ |
| **1–5 年級 835 字**：音訓・畫數・zh-TW 釋義・筆順・插圖 | ✅ |
| 漢字回版型（表：導入＋なぞり／裏：看圖寫字） | ✅ |
| 六道列印稽核（24 種情境）+ CI | ✅ |
| 實機列印驗收（範字 34mm／格子 26mm） | ✅ |
| 課表引擎（每日一張、階段解鎖） | ✅ |
| 錯題本與間隔複習（3/7/21/60 天） | ✅ |
| 進度儲存（localStorage、多孩子） | ✅ |
| 匯出／匯入備份（有 UI） | ✅ |
| 陪伴角色（自繪線稿，非 Open Peeps） | ✅ |

| 言葉と文のきまり／文章の読解／書き方 版型 | ⬜ |
| 程度檢定（Workers AI） | ⬜ |
| D1 進度同步 | ⬜ |

## 開發

```bash
pnpm install
pnpm data:fetch          # 抓配当表與音訓（首次，約 70 秒）
pnpm content:all         # 建構 content/ 並驗證
pnpm dev                 # http://localhost:5173
pnpm test                # 單元測試
pnpm audit:sheets        # 列印稽核（六道關卡）
./tools/deploy.sh        # 部署到 Cloudflare Pages
```

## 文件

- [設計文件](docs/plans/2026-08-03-open-kumon-design.md)
- [M1–M2 實作計畫](docs/plans/2026-08-03-open-kumon-m1-m2.md)

## 授權

- **程式碼**：MIT（見 [LICENSE](LICENSE)）
- **產出的教材內容** `content/`：CC BY-SA 4.0 — 因為衍生自 KanjiVG 與 OpenMoji，share-alike 具傳染性

第三方素材出處見 [CREDITS.md](CREDITS.md)。
