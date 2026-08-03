import { z } from 'zod'

/**
 * 学年別漢字配当表（文部科学省 小学校学習指導要領 平成29年告示・令和2年度実施）
 *
 * 這組數字是事實，不是設定。網路上多數資料集（KANJIDIC2、kanjiapi.dev）用的是
 * 改訂前的舊表（4年200／5年185／6年181，共1006字）。
 * 若某個測試因為這組數字而失敗，要修的是資料，不是這裡。
 */
export const GRADE_KANJI_COUNTS = {
  1: 80,
  2: 160,
  3: 200,
  4: 202,
  5: 193,
  6: 191,
} as const

export type Grade = keyof typeof GRADE_KANJI_COUNTS

/** 本專案只做 1–5 年級 */
export const TARGET_GRADES = [1, 2, 3, 4, 5] as const satisfies readonly Grade[]

export const KanjiEntrySchema = z
  .object({
    /** 漢字本體，一個字 */
    kanji: z.string().length(1),
    grade: z.number().int().min(1).max(6),
    strokes: z.number().int().positive(),
    /** 音読み（片假名） */
    on: z.array(z.string()),
    /** 訓読み（平假名，可能含送假名的 `.` 標記） */
    kun: z.array(z.string()),
    /** 繁體中文釋義，針對日文語境而非中文本義 */
    meaningZh: z.string().min(1),
    /** KanjiVG 檔名：unicode code point 補零到 5 位小寫 hex */
    kanjivgId: z.string().regex(/^[0-9a-f]{5}$/),
    /** OpenMoji hexcode；抽象字沒有對應插圖，可省略 */
    openmoji: z.string().optional(),
    /**
     * JLPT 等級（5 = N5 最易 … 1 = N1）。少數字不在任何級別內，為 null。
     * 課程可以照這個排序，走「最快考過 N5」的路線，而不是照日本學校的學年。
     */
    jlpt: z.number().int().min(1).max(5).nullable(),
  })
  .refine((e) => e.on.length + e.kun.length > 0, {
    message: '至少要有一個音読み或訓読み',
    path: ['on'],
  })

export type KanjiEntry = z.infer<typeof KanjiEntrySchema>

/** 由漢字算出 KanjiVG 檔名 */
export const kanjivgIdOf = (ch: string): string =>
  ch.codePointAt(0)!.toString(16).padStart(5, '0')
