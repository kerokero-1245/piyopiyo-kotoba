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
export type PhraseKey = 'seikai';
export const PHRASE_VOICE: Record<PhraseKey, VoiceSpec> = {
  seikai: { clip: 'p_seikai', text: 'せいかい' },
};

// ── 再生（3段構えの解決）─────────────────────────────────────────────
// enabled=false（おとなモードで読み上げオフ）なら何もしない。
export function playVoice(spec: VoiceSpec, opts?: { enabled?: boolean }): void {
  if (opts && opts.enabled === false) return;
  // ① 同梱クリップ
  if (isClipAvailable(spec.clip) && playClip(spec.clip as string)) return;
  // ② speechSynthesis（無ければ speak が no-op ＝ ③ 無音）
  speak(spec.text, { enabled: true });
}

// 便利関数: 単語をそのまま読む（出題・🔊・正解の「◯◯！」で使う）。
export function sayWord(word: WordItem, opts?: { enabled?: boolean }): void {
  playVoice(wordVoice(word), opts);
}

// 定型フレーズを読む（将来の「せいかい！」等の対応点）。
export function sayPhrase(key: PhraseKey, opts?: { enabled?: boolean }): void {
  playVoice(PHRASE_VOICE[key], opts);
}

// 「あそぶ」タップで1回呼ぶ。tier1（クリップ）と tier2（TTS）両方をアンロックする。
export function warmUpVoice(): void {
  warmUpClips();
  warmUpSpeech();
}

// 発声を止める（画面を離れるとき・次の発声の前）。両 tier を止める。
export function cancelVoice(): void {
  cancelClip();
  cancelSpeech();
}

// 読み上げが1つでも使えるか（同梱クリップが1つでもある or TTS が使える）。
// 両方無い環境のみ false ＝ ひらがな表示だけで成立（tier3）。
export function isVoiceAvailable(): boolean {
  const anyClip = Object.keys(CLIP_URLS).some((name) => isClipAvailable(name));
  return anyClip || isSpeechAvailable();
}
