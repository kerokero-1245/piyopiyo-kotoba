# assets/voice — 同梱音声クリップ（後工程で追加）

読み上げ（DESIGN §4）の3段構え「①同梱クリップ → ②speechSynthesis → ③無音」の、**①クリップ**を置く場所。
後工程で **VOICEVOX** により事前生成した日本語音声（`.m4a` / `.mp3` 等）をここに同梱する。

**現状は空**（クリップ未同梱）。アプリは常に ② speechSynthesis または ③ 無音へフォールバックし、
この状態でもゲームは完全に成立する（読み上げは「あると嬉しい」補助）。

## ファイル名の規約（基名）

| 対象 | 基名 | 例 | フォールバック読み上げ |
|---|---|---|---|
| 単語 | 単語の `id`（`src/game/words.ts`） | `banana.m4a`（🍌 ばなな） | `ばなな` |
| 定型フレーズ | `PHRASE_VOICE` の基名（`src/audio/voice.ts`） | `p_seikai.m4a` | `せいかい` |
| 出題文 | `ask_` + 単語id | `ask_banana.m4a`（「ばなな は どれ？」） | `ばなな は どれ？` |

対応表（クリップ基名 → 意味）は `src/audio/voice.ts` の spec ビルダー（`wordVoice` / `askVoice` / `PHRASE_VOICE`）が正典。

## 同梱の手順（後工程）

1. VOICEVOX で生成した音声をこのディレクトリに置く（ファイル基名＝上記の規約に一致させる）。
2. web ビルドにバンドルするため、`src/audio/voiceClips.ts` の `CLIP_URLS` に `require()` で登録する。例:

   ```ts
   export const CLIP_URLS: Record<string, string> = {
     banana: require('../../assets/voice/banana.m4a'),
     p_seikai: require('../../assets/voice/p_seikai.m4a'),
   };
   ```

   （存在しないファイルを `require` するとビルドが壊れるので、クリップを置いてから登録する）
3. 登録した基名は `src/audio/clips.ts` の解決ロジックが自動で拾い、tier1 として最優先で再生する。
   呼び出し側（画面）の変更は不要。

## メモ

- **外部送信ゼロ**: クリップは端末内の同梱アセット。ネットワークは使わない（WORLD §9）。
- **iOS Safari**: 音は最初のユーザー操作より前に鳴らせない。「あそぶ」タップの `warmUpVoice()` で
  （クリップがあれば）muted で1つ触ってアンロックする。
- 生成物のライセンス・再現に使ったパラメータ（話者・速度など）は、クリップ同梱時にこの README へ追記する。
