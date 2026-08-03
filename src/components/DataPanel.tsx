import { useRef, useState } from 'react'
import { Button, Flash } from '@primer/react'
import { IconDownload, IconUpload } from '@tabler/icons-react'
import { exportJson, importJson, saveStore } from '../storage/store'
import type { Store } from '../storage/schema'

export interface DataPanelProps {
  store: Store
  onRestore: (store: Store) => void
}

/**
 * 匯出／匯入。
 *
 * 進度只存在這台裝置的 localStorage 裡 —— 清一次瀏覽器資料、換一台電腦，
 * 幾個月的紀錄就沒了。在做出 D1 同步之前，這個按鈕是唯一的救生索，
 * 所以它不能只是躺在程式碼裡沒有介面。
 */
export function DataPanel({ store, onRestore }: DataPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const download = () => {
    const blob = new Blob([exportJson(store)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `open-kumon-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file: File) => {
    setError(null)
    setOk(false)
    const result = importJson(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    saveStore(result.store)
    onRestore(result.store)
    setOk(true)
  }

  const childCount = store.children.length
  const dayCount = new Set(store.children.flatMap((c) => c.completions.map((x) => x.day))).size

  return (
    <div className="chrome__data">
      <div className="chrome__section-title">備份</div>

      <div className="chrome__kanji-detail" style={{ marginBottom: 8 }}>
        {childCount} 個孩子 ・ {dayCount} 天紀錄。進度只存在這台裝置。
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button leadingVisual={IconDownload} onClick={download} disabled={childCount === 0}>
          匯出
        </Button>
        <Button leadingVisual={IconUpload} onClick={() => fileRef.current?.click()}>
          匯入
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
          e.target.value = ''
        }}
      />

      {error && (
        <Flash variant="danger" style={{ marginTop: 8, fontSize: 13 }}>
          匯入失敗：{error}
        </Flash>
      )}
      {ok && (
        <Flash variant="success" style={{ marginTop: 8, fontSize: 13 }}>
          已還原。
        </Flash>
      )}
    </div>
  )
}
