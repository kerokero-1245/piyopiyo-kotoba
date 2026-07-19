// ぴよぴよことば の BGM 配線（共有BGM基盤 src/audio/bgm/engine.ts を使う）。
// オルゴール風・軽やかな曲 'kotoba'（D メジャーペンタ・92BPM・16小節シームレスループ）を、
// 最初のユーザー操作（タイトルの「あそぶ」/タイトル読み上げタップ）で流す。
//
// 設計方針（共通ルール準拠）:
//   ・初期状態 ON（控えめ音量）。おとなモードのトグル（保存キー kotoba.bgm）で ON/OFF。
//   ・効果音（sounds.ts）と同じ AudioContext を共有する（configureBgm の getCtx 注入）。
//     声（sayWord ほか）の再生中のダッキングは voice.ts が duckBgm/unduckBgm で行う。
//   ・全 API は AudioContext 非対応・localStorage 例外でも無害（クラッシュしない）。
//   ・自動再生制限を守るため startBgm は必ずユーザー操作のハンドラ内から呼ぶ。

import { startBgm, setBgmEnabled, configureBgm, getBgmState } from './bgm/engine';
import { getSharedAudioContext } from './sounds';
import { getBgmOn, setBgmOn } from '../settings';

const SONG = 'kotoba' as const;

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  configured = true;
  try {
    // 効果音と同一 AudioContext を共有（無ければエンジンが自前で 1つ生成する）。
    configureBgm({ getCtx: () => getSharedAudioContext() });
  } catch {
    // 設定できなくても遊びは壊さない
  }
}

// 最初のユーザー操作（タイトルの「あそぶ」/タイトル読み上げ）のハンドラ内で1回呼ぶ。
// 保存設定が ON のときだけ 'kotoba' を流す。二重呼び出しは冪等（startBgm 側が同一曲を無視）。
export function initKotobaBgm(): void {
  ensureConfigured();
  try {
    const on = getBgmOn();
    setBgmEnabled(on); // 保存設定にエンジンの ON/OFF をそろえる
    if (on) startBgm(SONG); // ジェスチャ起点で開始（冪等）
  } catch {
    // 無害
  }
}

// おとなモードの「BGM ながす/ながさない」トグル。ON で（ジェスチャ文脈なので）即再開、
// OFF で即フェード停止。保存キー kotoba.bgm を更新する。
export function setKotobaBgmOn(on: boolean): void {
  ensureConfigured();
  try {
    setBgmOn(on); // localStorage 永続（kotoba.bgm）
    setBgmEnabled(on); // OFF は engine 側で stopBgm(0.3)（なめらかにフェード）
    if (on) startBgm(SONG); // まだ鳴っていなければ開始（冪等・トグルのタップがジェスチャ起点）
  } catch {
    // 無害
  }
}

// 検証・デバッグ用の状態スナップショット（{ supported, enabled, running, songId, ducked, ownsCtx }）。
export { getBgmState };

// Playwright 等からの検証用に状態を window に露出（web のみ・無害）。既存挙動には影響しない。
try {
  (globalThis as unknown as { __kotobaBgm?: { getState: () => ReturnType<typeof getBgmState> } }).__kotobaBgm =
    { getState: () => getBgmState() };
} catch {
  // 無害
}
