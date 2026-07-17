// アプリ共通の型（DESIGN §3 準拠）。盤面座標は持たない（ベルトの並び・大きさは描画側が実測から自動レイアウト）。

// 単語のカテゴリ。id で管理し、表示ラベルと絵文字は別に持つ（おとなモードのオン/オフに使う）。
export type CategoryId = 'yasai' | 'kudamono' | 'doubutsu' | 'norimono';

// 辞書の1件。word はひらがな（読み上げにもこの文字列をそのまま使う）。
// id は安定した半角英字キー。同梱音声クリップのファイル名（基名）にも使う（audio/voice.ts）。
export interface WordItem {
  id: string; // 'banana'（全語ユニーク。クリップ基名 = この id）
  emoji: string; // 🍌
  word: string; // 'ばなな'（ひらがな・読み上げにもこの文字列を使う）
  category: CategoryId;
}

// 1問。answer を含む K 個の選択肢（シャッフル済み）をベルトに流す。
export interface Question {
  answer: WordItem; // 正解
  choices: WordItem[]; // answer を含む K 個・シャッフル済み
}

// 画面ルート（文字ヘッダの無い最小ステートルーター）。
export type Route = { name: 'title' } | { name: 'play' } | { name: 'otona' };