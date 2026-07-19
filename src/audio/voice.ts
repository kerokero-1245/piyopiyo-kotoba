// 読み上げの入口（DESIGN §4）。画面はこのモジュールだけを呼ぶ。内部で3段構えに解決する:
//   ① 同梱クリップ（tier1 / clips.ts）… VOICEVOX 事前生成の音声。あれば最優先で再生。
//   ② speechSynthesis（tier2 / speech.ts）… ブラウザ内蔵の日本語合成音声（ja-JP）。
//   ③ 無音（tier3）… どちらも無ければ何もしない。ひらがな表示だけでゲームは成立する。
//
// クリップは今回まだ同梱しない（voiceClips.CLIP_URLS は空）。よって現状は必ず ②→③ に落ちる。
// 辞書エントリ・定型フレーズ・出題文それぞれに「クリップ基名」を対応付けられる設計にしてある
// （wordVoice / PHRASE_VOICE / askVoice）。後工程でクリップを同梱すれば、同じ呼び出しのまま
// tier1 が効くようになる（呼び出し側の変更は不要）。
//
// iOS Safari の自動再生制限（最初のユーザー操作より前に音を出せない）は warmUpVoice() で守る。

import { WordItem } from '../types';
import { isClipAvailable, playClip, warmUpClips, cancelClip } from './clips';
import { CLIP_URLS } from './voiceClips';
import { speak, warmUpSpeech, cancelSpeech, isSpeechAvailable } from './speech';
import { duckBgm, unduckBgm } from './bgm/engine';

// ── BGM ダッキング協調 ────────────────────────────────────────────────
// ことばは発話頻度が高い（sayWord を出題ごと・タップごとに連発する）。声のたびに
// duck→unduck を往復させると BGM 音量が小刻みに揺れて耳障りになる。そこで:
//   ・ダッキングは「単段」（多重に沈めない。声が続く間は下げたまま／冪等）。
//   ・最新の声だけが復帰を予約できる（追い越された古い声の遅延コールバックは無視）。
//   ・最後の声が終わってから少し待って（RELEASE_HOLD_MS）からなめらかに戻す
//     （連続発話のあいだの谷を埋め、フラップを防ぐ）。
//   ・onend が来ない環境向けに保険タイマーで必ず戻す（ダッキングを残さない）。
// duckBgm/unduckBgm 自体は engine 側で setTargetAtTime によりなめらか（沈み速い・戻りゆっくり）。
// AudioContext 非対応・BGM無効でも duckBgm/unduckBgm は無害な no-op。
const RELEASE_HOLD_MS = 220; // 最後の声が終わってから BGM を戻すまでの猶予
const DUCK_SAFETY_MS = 8000; // onend 欠落時の保険（必ず戻す）

let voiceSeq = 0; // playVoice ごとに増える世代番号（最新が「持ち主」）
let ducked = false; // いま BGM を下げているか（単段・冪等）
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearReleaseTimer(): void {
  if (releaseTimer != null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
}
function clearSafetyTimer(): void {
  if (safetyTimer != null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

// 声の再生開始。BGM を（まだなら）1段だけ沈め、この声の世代番号を返す。
function beginVoiceDuck(): number {
  const seq = ++voiceSeq;
  clearReleaseTimer(); // 保留中の復帰を取り消す（連続発話は下げたまま＝フラップ防止）
  if (!ducked) {
    ducked = true;
    try {
      duckBgm();
    } catch {
      // 無害
    }
  }
  clearSafetyTimer();
  safetyTimer = setTimeout(() => {
    safetyTimer = null;
    requestRelease(seq);
  }, DUCK_SAFETY_MS);
  return seq;
}

// 猶予をおいてから BGM を戻す（最新の声でなければ何もしない）。
function requestRelease(seq: number): void {
  if (seq !== voiceSeq) return; // すでに新しい声が来ている → 下げたまま
  clearReleaseTimer();
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (seq !== voiceSeq) return; // 猶予中に新しい声 → 下げたまま
    if (ducked) {
      ducked = false;
      clearSafetyTimer();
      try {
        unduckBgm();
      } catch {
        // 無害
      }
    }
  }, RELEASE_HOLD_MS);
}

// 声の再生終了（ended / onend / error / 再生不可）で呼ぶ。最新の声のみ復帰を予約できる。
function endVoiceDuck(seq: number): void {
  requestRelease(seq);
}

// 明示停止（画面を離れる等）。進行中の声を無効化し、猶予つきで BGM を戻す。
function releaseVoiceDuckNow(): void {
  voiceSeq += 1; // 進行中の全コールバックを無効化
  requestRelease(voiceSeq);
}

// 読み上げ1回ぶんの指定。clip=同梱クリップの基名（無ければ undefined）/ text=フォールバック読み上げ文字列。
export interface VoiceSpec {
  clip?: string; // 同梱クリップ基名（voiceClips のキー）。あれば tier1 で再生。
  text: string; // tier2（speechSynthesis）で読む文字列（ひらがな）。
}

// ── spec ビルダー（クリップ基名の対応表）──────────────────────────────────
// 辞書エントリ → クリップ基名は単語 id。フォールバックは word（ひらがな）。
export function wordVoice(word: WordItem): VoiceSpec {
  return { clip: word.id, text: word.word };
}

// 出題文「◯◯ は どれ？」→ クリップ基名は 'ask_' + 単語id。フォールバックは全文。
// （現状 UI は出題時に単語だけを読む。全文クリップを同梱したい時の対応点として用意。）
export function askVoice(word: WordItem): VoiceSpec {
  return { clip: `ask_${word.id}`, text: `${word.word} は どれ？` };
}

// 定型フレーズ。clip=同梱時の基名 / text=フォールバック読み上げ。
// title  … タイトル画面で「ぴよぴよことば」を読む（タップ起点）。
// arere / oshii … 誤答タップのやさしい声かけ（否定語なし・責めない・WORLD 正典）。
export type PhraseKey = 'seikai' | 'title' | 'arere' | 'oshii';
export const PHRASE_VOICE: Record<PhraseKey, VoiceSpec> = {
  seikai: { clip: 'p_seikai', text: 'せいかい' },
  title: { clip: 'p_title', text: 'ぴよぴよことば' },
  arere: { clip: 'p_arere', text: 'あれれ' },
  oshii: { clip: 'p_oshii', text: 'おしい' },
};

// 誤答タップの声かけを「あれれ」→「おしい」で交互に返すローテ（呼ぶたび1つ進む）。
// どちらも やさしい相づち。否定語・失敗表示はしない（罰なし・DESIGN §5 / WORLD 正典）。
const WRONG_CHEERS: PhraseKey[] = ['arere', 'oshii'];
let wrongCheerIdx = 0;

// ── 再生（3段構えの解決）─────────────────────────────────────────────
// enabled=false（おとなモードで読み上げオフ）なら何もしない。
export function playVoice(spec: VoiceSpec, opts?: { enabled?: boolean }): void {
  if (opts && opts.enabled === false) return;
  // 声の再生に入る前に BGM をダッキング（声が終わったら done で戻す）。
  const seq = beginVoiceDuck();
  const done = () => endVoiceDuck(seq);
  // ① 同梱クリップ（VOICEVOX）。鳴ったら done は 'ended'/'error'/再生不可 で呼ばれる。
  if (isClipAvailable(spec.clip) && playClip(spec.clip as string, done)) return;
  // ② speechSynthesis。鳴ったら done は onend/onerror で呼ばれる。
  if (speak(spec.text, { enabled: true, onDone: done })) return;
  // ③ 無音（クリップも TTS も無い）: 何も鳴らないのでダッキングを直ちに解除する。
  done();
}

// 便利関数: 単語をそのまま読む（出題・🔊・正解の「◯◯！」で使う）。
export function sayWord(word: WordItem, opts?: { enabled?: boolean }): void {
  playVoice(wordVoice(word), opts);
}

// 定型フレーズを読む（タイトルの「ぴよぴよことば」・将来の「せいかい！」等の対応点）。
export function sayPhrase(key: PhraseKey, opts?: { enabled?: boolean }): void {
  playVoice(PHRASE_VOICE[key], opts);
}

// 誤答タップのやさしい声かけ。呼ぶたびに「あれれ」「おしい」を交互に読む。
// enabled=false（読み上げオフ）なら何もしない（＝ 効果音だけ）。3段構えは playVoice にまかせる。
export function sayWrongCheer(opts?: { enabled?: boolean }): void {
  const key = WRONG_CHEERS[wrongCheerIdx % WRONG_CHEERS.length];
  wrongCheerIdx += 1;
  playVoice(PHRASE_VOICE[key], opts);
}

// 「あそぶ」タップで1回呼ぶ。tier1（クリップ）と tier2（TTS）両方をアンロックする。
export function warmUpVoice(): void {
  warmUpClips();
  warmUpSpeech();
}

// 発声を止める（画面を離れるとき・次の発声の前）。両 tier を止め、BGM のダッキングも戻す。
export function cancelVoice(): void {
  cancelClip();
  cancelSpeech();
  releaseVoiceDuckNow();
}

// 読み上げが1つでも使えるか（同梱クリップが1つでもある or TTS が使える）。
// 両方無い環境のみ false ＝ ひらがな表示だけで成立（tier3）。
export function isVoiceAvailable(): boolean {
  const anyClip = Object.keys(CLIP_URLS).some((name) => isClipAvailable(name));
  return anyClip || isSpeechAvailable();
}
