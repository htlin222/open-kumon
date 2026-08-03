/**
 * kuromoji 沒有隨附型別定義。只用到 builder / tokenize 與少數詞性欄位，
 * 宣告成最小可用的形狀即可。
 */
declare module 'kuromoji' {
  export interface IpadicFeatures {
    surface_form: string
    /** 詞性大分類：名詞・動詞・助詞… */
    pos: string
    /** 詞性細分類 1：格助詞・連体化・終助詞… */
    pos_detail_1: string
    reading?: string
  }

  export interface Tokenizer<T> {
    tokenize(text: string): T[]
  }

  export interface Builder<T> {
    build(callback: (err: Error | null, tokenizer: Tokenizer<T>) => void): void
  }

  export function builder(options: { dicPath: string }): Builder<IpadicFeatures>

  const kuromoji: {
    builder: typeof builder
  }
  export default kuromoji
}
