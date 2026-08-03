import { z } from 'zod'

/**
 * 進度資料的 schema。
 *
 * localStorage 的內容是使用者可以隨手改壞的（開 devtools、裝擴充套件、
 * 或是我自己改版改壞舊資料）。所以讀取時一律驗證，壞資料退回初始狀態
 * 並保留備份，絕不讓網站因此白畫面 —— 孩子明天早上還是要有一張紙可以印。
 */

export const STORAGE_KEY = 'open-kumon/progress'
export const BACKUP_KEY = 'open-kumon/progress.corrupt'
export const SCHEMA_VERSION = 1

const DayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '必須是 YYYY-MM-DD')

export const MistakeRecordSchema = z.object({
  kanji: z.string().length(1),
  stage: z.number().int().min(0).max(3),
  dueOn: DayKeySchema,
  updatedAt: DayKeySchema,
})

export const CompletionSchema = z.object({
  day: DayKeySchema,
  kind: z.enum(['lesson', 'review', 'writing']),
  /** 正課才有；複習卷為 null */
  unitNo: z.number().int().positive().nullable(),
  wrong: z.array(z.string()),
  right: z.array(z.string()),
})

export const ChildSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdOn: DayKeySchema,
  /** 目前主線的年級 */
  grade: z.number().int().min(1).max(6),
  /** 主線下一回（1-based） */
  nextUnitNo: z.number().int().positive(),
  mistakes: z.array(MistakeRecordSchema),
  completions: z.array(CompletionSchema),
})

export const StoreSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  children: z.array(ChildSchema),
  activeChildId: z.string().nullable(),
})

export type MistakeRecordData = z.infer<typeof MistakeRecordSchema>
export type Completion = z.infer<typeof CompletionSchema>
export type Child = z.infer<typeof ChildSchema>
export type Store = z.infer<typeof StoreSchema>

export const emptyStore = (): Store => ({
  version: SCHEMA_VERSION,
  children: [],
  activeChildId: null,
})
