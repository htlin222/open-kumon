import { Button, Heading, TextInput } from '@primer/react'
import { IconPrinter, IconFlame, IconRefresh, IconConfetti } from '@tabler/icons-react'
import { useState } from 'react'
import { MistakeChecklist } from './MistakeChecklist'
import { DataPanel } from './DataPanel'
import { Mascot } from './Mascot'
import { PlacementTest } from './PlacementTest'
import { pickForSheet } from '../content/readings'
import type { ProgressView } from '../hooks/useProgress'
import type { KanjiEntry } from '../content/schema'

export interface TodayPanelProps {
  progress: ProgressView
  lookup: (kanji: string) => KanjiEntry | undefined
}

export function TodayPanel({ progress, lookup }: TodayPanelProps) {
  const { assignment, unit, streak, dueCount, totalUnits, childName, doneToday } = progress

  if (!childName) return <FirstRun onCreate={progress.createChild} />

  return (
    <>
      <Heading as="h1" style={{ fontSize: 20, marginBottom: 4 }}>
        open-kumon
      </Heading>
      <div className="chrome__unit">
        {childName} ・ {progress.grade} 年生 ・ {progress.today}
      </div>

      <div className="chrome__stats">
        <span title="連續天數">
          <IconFlame size={16} /> {streak} 天
        </span>
        {dueCount > 0 && (
          <span title="到期待複習">
            <IconRefresh size={16} /> {dueCount} 字
          </span>
        )}
      </div>

      {assignment?.kind === 'finished' ? (
        <div>
          <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0', color: '#1f883d' }}>
            <Mascot mood="cheer" size={110} />
          </div>
          <div className="chrome__note" style={{ marginTop: 0 }}>
            <IconConfetti size={18} /> {progress.grade} 年生的字全部寫完了。
          </div>
          {progress.nextGrade ? (
            <Button variant="primary" className="chrome__print" onClick={progress.promote}>
              升上 {progress.nextGrade} 年生
            </Button>
          ) : (
            <div className="chrome__note">下一個年級的內容還沒建構。</div>
          )}
        </div>
      ) : (
        <>
          <div className="chrome__today">
            {assignment?.kind === 'review' ? (
              <>
                <strong>今天是複習卷</strong>
                <div>到期 {dueCount} 個字，先把它們補起來再往前走。</div>
              </>
            ) : (
              <>
                <strong>
                  今天：第 {assignment?.kind === 'lesson' ? assignment.unitNo : '-'} / {totalUnits} 回
                </strong>
                {assignment?.kind === 'lesson' && assignment.injected.length > 0 && (
                  <div>另外混入 {assignment.injected.length} 個要複習的字。</div>
                )}
              </>
            )}
          </div>

          <Button
            variant="primary"
            leadingVisual={IconPrinter}
            className="chrome__print"
            onClick={() => window.print()}
          >
            列印今天這張（雙面）
          </Button>

          {unit && (
            <>
              <div className="chrome__section-title">這一回的字</div>
              {unit.newKanji.map((k) => (
                <KanjiRow key={k.kanji} entry={k} />
              ))}
            </>
          )}

          {doneToday ? (
            <div>
              <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0', color: '#1f883d' }}>
                <Mascot mood="cheer" size={90} />
              </div>
              <div className="chrome__note" style={{ marginTop: 0 }}>
                今天這張已經完成了。明天會有新的一張。
              </div>
            </div>
          ) : (
            <MistakeChecklist
              kanji={progress.checkable}
              lookup={lookup}
              onSubmit={progress.submit}
            />
          )}
        </>
      )}

      <DataPanel store={progress.store} onRestore={progress.restore} />
    </>
  )
}

function KanjiRow({ entry }: { entry: KanjiEntry }) {
  const on = pickForSheet(entry.on, 2)
  const kun = pickForSheet(entry.kun, 2)
  return (
    <div className="chrome__kanji-row">
      <div className="chrome__kanji-glyph">{entry.kanji}</div>
      <div>
        <div className="chrome__kanji-gloss">{entry.meaningZh}</div>
        <div className="chrome__kanji-detail">
          {on.length > 0 && <div>音讀　{on.join('・')}</div>}
          {kun.length > 0 && <div>訓讀　{kun.join('・')}</div>}
          <div>{entry.strokes} 畫</div>
        </div>
      </div>
    </div>
  )
}

function FirstRun({ onCreate }: { onCreate: (name: string, grade?: number) => void }) {
  const [name, setName] = useState('')
  const [testing, setTesting] = useState(false)

  if (testing) {
    return (
      <PlacementTest
        childName={name}
        onSkip={() => onCreate(name, 1)}
        onDone={(r) => onCreate(name, r.needsKana ? 1 : r.startGrade)}
      />
    )
  }

  return (
    <>
      <Heading as="h1" style={{ fontSize: 20, marginBottom: 8 }}>
        open-kumon
      </Heading>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0', color: '#57606a' }}>
        <Mascot mood="wave" size={110} />
      </div>
      <div className="chrome__note" style={{ marginTop: 0 }}>
        先建立一個孩子的檔案。進度存在這台裝置上，不會上傳。
      </div>
      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="孩子的名字"
        aria-label="孩子的名字"
        block
        style={{ margin: '12px 0' }}
      />
      <Button
        variant="primary"
        className="chrome__print"
        disabled={!name.trim()}
        onClick={() => setTesting(true)}
      >
        做程度檢定（約 3 分鐘）
      </Button>
      <button
        className="placement__skip"
        disabled={!name.trim()}
        onClick={() => onCreate(name.trim(), 1)}
      >
        跳過，直接從 1 年級開始
      </button>
    </>
  )
}
