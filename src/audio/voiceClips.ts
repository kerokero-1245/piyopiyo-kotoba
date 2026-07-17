// 同梱音声クリップの登録表（tier1 の素材）。
// 後工程で VOICEVOX により事前生成した音声クリップ（assets/voice/ 配下）を差し込むための「置き場」。
// 現状は空 ＝ クリップ未同梱。よって voice.ts は必ず speechSynthesis（tier2）または無音（tier3）へ
// フォールバックし、この状態でもゲームは完全に成立する（読み上げは「あると嬉しい」補助）。
//
// ── クリップの命名規約（基名＝このオブジェクトのキー）─────────────────────────
//   単語:   単語の id（words.ts）。例 'banana'（🍌 ばなな）, 'ninjin'（🥕 にんじん）
//   定型句: PHRASE 用の基名。例 'p_seikai'（せいかい！）
//   出題文: 'ask_' + 単語id。例 'ask_banana'（「ばなな は どれ？」）
//   → いずれも voice.ts の spec ビルダー（wordVoice / askVoice / PHRASE_VOICE）と一致させる。
//
// ── クリップ同梱の手順（後工程）────────────────────────────────────────────
//   1. VOICEVOX で生成した音声（m4a / mp3 など）を assets/voice/ に置く（ファイル基名＝下記キー）。
//   2. web ビルドにバンドルするため require() で URL 化し、下表に登録する。例:
//        banana: require('../../assets/voice/banana.m4a'),
//        p_seikai: require('../../assets/voice/p_seikai.m4a'),
//      （存在しないファイルを require するとビルドが壊れるため、クリップを置いてから登録する）
//   3. 登録した基名は clips.ts の解決ロジックが自動で拾い、tier1 として最優先で再生する。
//
// 外部送信ゼロ: クリップは端末内の同梱アセット。ネットワークは使わない。

// key = クリップ基名, value = 再生可能な URL（require の戻り値）。空 = クリップ未同梱。
export const CLIP_URLS: Record<string, string> = {
  // クリップを同梱したらここに登録する（上記手順2）。現状は意図的に空。
};

// 指定した基名のクリップが登録済みか。
export function hasClip(name: string | undefined): boolean {
  if (!name) return false;
  return Object.prototype.hasOwnProperty.call(CLIP_URLS, name) && !!CLIP_URLS[name];
}
