import { useState } from 'react'
import { ThemeProvider, BaseStyles, SplitPageLayout, Button, Heading } from '@primer/react'
import { IconPrinter, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Preview, parseParams } from './routes/Preview'
import { KANJI_BY_GRADE } from './content/registry'
import { buildUnit, unitCount } from './curriculum/units'
import { pickForSheet } from './content/readings'
import './app.css'

export function App() {
  const initial = parseParams(location.search)
  const [unitNo, setUnitNo] = useState(initial.unitNo)
  const grade = initial.grade

  const entries = KANJI_BY_GRADE[grade]
  const total = entries ? unitCount(entries) : 0
  const current = Math.min(Math.max(1, unitNo), Math.max(1, total))
  const unit = entries ? buildUnit(entries, grade, current) : null

  // 稽核模式：只有紙面，沒有外殼
  if (initial.raw) return <Preview params={{ ...initial, unitNo: current }} />

  return (
    <ThemeProvider>
      <BaseStyles>
        <SplitPageLayout>
          {/*
            中文全部住在這一欄。紙上一個中文字都沒有 ——
            孩子寫紙，卡住時看螢幕。
          */}
          <SplitPageLayout.Pane position="start" className="app-chrome" aria-label="學習輔助">
            <Heading as="h1" style={{ fontSize: 20, marginBottom: 4 }}>
              open-kumon
            </Heading>
            <div className="chrome__unit">
              かん字 {grade} 年生 ・ 第 {current} / {total} 回
            </div>

            <div className="chrome__nav">
              <Button
                leadingVisual={IconChevronLeft}
                disabled={current <= 1}
                onClick={() => setUnitNo(current - 1)}
              >
                上一回
              </Button>
              <Button
                trailingVisual={IconChevronRight}
                disabled={current >= total}
                onClick={() => setUnitNo(current + 1)}
              >
                下一回
              </Button>
            </div>

            <Button
              variant="primary"
              leadingVisual={IconPrinter}
              className="chrome__print"
              onClick={() => window.print()}
            >
              列印這一回（雙面）
            </Button>

            <div className="chrome__section-title">這一回的新字</div>

            {unit?.newKanji.map((k) => {
              const on = pickForSheet(k.on, 2)
              const kun = pickForSheet(k.kun, 2)
              return (
                <div key={k.kanji} className="chrome__kanji-row">
                  <div className="chrome__kanji-glyph">{k.kanji}</div>
                  <div>
                    <div className="chrome__kanji-gloss">{k.meaningZh}</div>
                    <div className="chrome__kanji-detail">
                      {on.length > 0 && <div>音讀　{on.join('・')}</div>}
                      {kun.length > 0 && <div>訓讀　{kun.join('・')}</div>}
                      <div>{k.strokes} 畫</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="chrome__note">
              紙上不印中文，只有日文和圖。孩子寫的時候卡住，看這一欄。
              <br />
              背面是「看圖寫字」，複習前面學過的。
            </div>
          </SplitPageLayout.Pane>

          <SplitPageLayout.Content>
            <div className="preview-area">
              <Preview params={{ ...initial, unitNo: current }} />
            </div>
          </SplitPageLayout.Content>
        </SplitPageLayout>
      </BaseStyles>
    </ThemeProvider>
  )
}
