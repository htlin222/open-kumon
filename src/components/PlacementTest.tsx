import { useMemo, useState } from 'react'
import { Button, Heading, ProgressBar } from '@primer/react'
import { Mascot } from './Mascot'
import { startPlacement, answer, currentProbe, type ProbeSource, type PlacementResult } from '../placement/engine'
import { kanaProbes, kanjiProbes, GRAMMAR_PROBES } from '../placement/probes'
import { KANJI_BY_GRADE } from '../content/registry'

export interface PlacementTestProps {
  childName: string
  onDone: (result: PlacementResult) => void
  onSkip: () => void
}

export function PlacementTest({ childName, onDone, onSkip }: PlacementTestProps) {
  const src = useMemo<ProbeSource>(
    () => ({
      kana: kanaProbes,
      kanji: (grade, count) => kanjiProbes(KANJI_BY_GRADE[grade] ?? [], grade, count),
      grammar: GRAMMAR_PROBES,
    }),
    [],
  )

  const [state, setState] = useState(() => startPlacement(src))
  const probe = currentProbe(state)

  if (state.phase.stage === 'done') {
    return <Summary result={state.phase.result} childName={childName} onDone={onDone} />
  }

  const pct = Math.round((state.progress.done / state.progress.estimate) * 100)

  return (
    <div>
      <Heading as="h2" style={{ fontSize: 16, marginBottom: 4 }}>
        程度檢定
      </Heading>
      <div className="chrome__kanji-detail" style={{ marginBottom: 10 }}>
        第 {state.progress.done + 1} 題 ・ 約 {state.progress.estimate} 題
      </div>
      <ProgressBar progress={pct} aria-label="檢定進度" />

      {probe && (
        <div style={{ marginTop: 16 }}>
          <div className="chrome__kanji-detail">{probe.instruction}</div>
          <div className="placement__prompt">{probe.prompt}</div>

          <div className="placement__choices">
            {probe.choices.map((c) => (
              <Button key={c} onClick={() => setState((s) => answer(s, c, src))}>
                {c}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="chrome__note">
        指示語是中文，題目是日文 —— 這樣測的才是「會不會」，不是「看不看得懂題目」。
        <br />
        <button className="placement__skip" onClick={onSkip}>
          跳過檢定，直接從 1 年級開始
        </button>
      </div>
    </div>
  )
}

function Summary({
  result,
  childName,
  onDone,
}: {
  result: PlacementResult
  childName: string
  onDone: (r: PlacementResult) => void
}) {
  return (
    <div>
      <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0', color: '#1f883d' }}>
        <Mascot mood="cheer" size={100} />
      </div>

      <Heading as="h2" style={{ fontSize: 16, marginBottom: 8 }}>
        {childName} 的檢定結果
      </Heading>

      <div className="chrome__today">
        {result.needsKana ? (
          <>
            <strong>建議先把五十音練穩</strong>
            <div>
              假名 {result.kanaScore} / {result.kanaTotal} —— 漢字先不急，讀不出假名的話，
              漢字的讀音也記不住。
            </div>
          </>
        ) : (
          <>
            <strong>建議從 {result.startGrade} 年生開始</strong>
            <div>
              假名 {result.kanaScore} / {result.kanaTotal}、助詞 {result.grammarScore} /{' '}
              {result.grammarTotal}
            </div>
          </>
        )}
      </div>

      <div className="chrome__section-title">各年級漢字</div>
      {result.kanjiRounds.map((r) => (
        <div key={r.grade} className="chrome__kanji-detail">
          {r.grade} 年生　{r.correct} / {r.total}　{r.correct >= 1 ? '通過' : '未通過'}
        </div>
      ))}

      <div className="chrome__kanji-detail" style={{ marginTop: 10 }}>
        {result.grammarReady
          ? '助詞已有基礎，之後可以解鎖「言葉と文のきまり」。'
          : '助詞還不穩，先專心練漢字，文法系列之後再開。'}
      </div>

      <Button variant="primary" className="chrome__print" onClick={() => onDone(result)}>
        就從這裡開始
      </Button>
    </div>
  )
}
