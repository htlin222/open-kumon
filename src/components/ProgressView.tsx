import { useEffect, useState } from 'react'
import { Heading } from '@primer/react'
import { IconFlame, IconRefresh, IconCheck } from '@tabler/icons-react'
import { Mascot } from './Mascot'
import { streakOf } from '../curriculum/schedule'
import { dueOn } from '../curriculum/srs'
import { toDayKey } from '../curriculum/day'
import type { Store } from '../storage/schema'

/**
 * 唯讀的進度頁，給手機看。
 *
 * 擁有者要的是「今天寫了沒」，不是在手機上操作 —— 所以這頁沒有任何按鈕。
 * 資料來自電腦推上去的快照，看不到就是還沒推過。
 */
export function ProgressView() {
  const [store, setStore] = useState<Store | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading')
  const today = toDayKey(new Date())

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw) => {
        const data = raw as Store & { empty?: boolean }
        if (data.empty) return setState('empty')
        setStore(data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  if (state === 'loading') return <Wrap>載入中…</Wrap>
  if (state === 'error') return <Wrap>讀不到進度。電腦上開過網站之後才會有快照。</Wrap>
  if (state === 'empty' || !store) return <Wrap>還沒有進度。在電腦上完成一回之後就會出現。</Wrap>

  return (
    <Wrap>
      {store.children.map((child) => {
        const days = child.completions.map((c) => c.day)
        const streak = streakOf(days, today)
        const doneToday = days.includes(today)
        const due = dueOn(child.mistakes, today).length
        const lessons = child.completions.filter((c) => c.kind === 'lesson').length

        return (
          <div key={child.id} className="progress__card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: doneToday ? '#1f883d' : '#8c959f' }}>
                <Mascot mood={doneToday ? 'cheer' : 'write'} size={64} />
              </div>
              <div>
                <div className="progress__name">{child.name}</div>
                <div className="progress__grade">
                  {child.grade} 年生 ・ 第 {child.nextUnitNo} 回
                </div>
              </div>
            </div>

            <div className={`progress__today ${doneToday ? 'is-done' : ''}`}>
              {doneToday ? (
                <>
                  <IconCheck size={18} /> 今天寫完了
                </>
              ) : (
                '今天還沒寫'
              )}
            </div>

            <div className="progress__stats">
              <span>
                <IconFlame size={16} /> 連續 {streak} 天
              </span>
              <span>
                <IconRefresh size={16} /> 待複習 {due} 字
              </span>
              <span>累計 {lessons} 回</span>
            </div>
          </div>
        )
      })}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="progress__page">
      <Heading as="h1" style={{ fontSize: 20, marginBottom: 16 }}>
        open-kumon
      </Heading>
      {children}
    </div>
  )
}
