import { useCallback } from 'react'
import { ThemeProvider, BaseStyles, SplitPageLayout } from '@primer/react'
import { StaticPreview, SheetStack, parseParams, Missing } from './routes/Preview'
import { TodayPanel } from './components/TodayPanel'
import { useProgress } from './hooks/useProgress'
import { KANJI_BY_GRADE } from './content/registry'
import './app.css'

export function App() {
  const params = parseParams(location.search)

  // 稽核模式必須完全不碰進度：Playwright 的六道關卡不該受 localStorage 影響
  if (params.raw) return <StaticPreview params={params} />

  return (
    <ThemeProvider>
      <BaseStyles>
        <Shell params={params} />
      </BaseStyles>
    </ThemeProvider>
  )
}

function Shell({ params }: { params: ReturnType<typeof parseParams> }) {
  const progress = useProgress()

  const lookup = useCallback(
    (kanji: string) => KANJI_BY_GRADE[params.grade]?.find((e) => e.kanji === kanji),
    [params.grade],
  )

  // ?unit= 指定回數 → 自由瀏覽，不影響今天的進度
  const browsing = params.unitNo !== null

  return (
    <SplitPageLayout>
      <SplitPageLayout.Pane position="start" className="app-chrome" aria-label="學習輔助">
        {browsing ? (
          <div className="chrome__note" style={{ marginTop: 0 }}>
            自由瀏覽第 {params.unitNo} 回。
            <br />
            <a href={location.pathname}>回到今天這張</a>
          </div>
        ) : (
          <TodayPanel progress={progress} lookup={lookup} />
        )}
      </SplitPageLayout.Pane>

      <SplitPageLayout.Content>
        <div className="preview-area">
          {browsing ? (
            <StaticPreview params={params} />
          ) : progress.unit ? (
            <SheetStack unit={progress.unit} side={params.side} />
          ) : progress.childName ? (
            <Missing grade={params.grade} />
          ) : null}
        </div>
      </SplitPageLayout.Content>
    </SplitPageLayout>
  )
}
