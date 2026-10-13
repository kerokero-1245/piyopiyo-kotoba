// 端末内の保存もの（DESIGN §9・WORLD §7 準拠）。すべて `kotoba.` プレフィックス。
// - あつめた ほし の累計（totalStars）… ごほうび（スタンプ）のコレクション。街の燃料（やおやさん）に合流。
// - あつめた ほし を 0 に もどした ときの累計（starsResetAt）… 表示を 0 から数え直すための控え
// - 有効カテゴリ（cats）… おとなモードのオン/オフ。空にはできない（最低1つ）。
// - 読み上げ（tts）… おとなモードのオン/オフ。
// web は localStorage に保存、native はセッション内キャッシュのみ（MVP）。外部送信なし。
// 取得失敗時は既定値にフォールバック。消えても遊びは壊れない（罰・失敗表示はしない）。
// 他アプリ・街のキー（meiro.* sansu.* land.*）は読み書き禁止。書いてよいのは kotoba.* のみ。

import { Platform } from "react-native";
import { TOTAL_STARS } from "@kerokero-1245/piyo-assets/keys";
import { CategoryId, MojiMode } from "./types";

// 値の正本は piyo-assets/keys。街（ランド）が同じ定数を読む
const STAR_KEY = TOTAL_STARS.kotoba;
const STAR_RESET_AT_KEY = "kotoba.starsResetAt";
const CATS_KEY = "kotoba.cats";
const TTS_KEY = "kotoba.tts";
const BGM_KEY = "kotoba.bgm";
const MOJI_KEY = "kotoba.moji";

export const ALL_CATEGORIES: CategoryId[] = [
  "yasai",
  "kudamono",
  "doubutsu",
  "norimono",
];

// 型の都合で最小限だけ宣言（DOM lib に依存しない）。
interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
function ls(): WebStorage | null {
  if (Platform.OS !== "web") return null;
  try {
    const s = (globalThis as unknown as { localStorage?: WebStorage })
      .localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

// ── あつめた ほし（累計スタンプ）───────────────────────────────
// 1問クリアごとに +1 する“ごほうび”の合計。減ることはない（マイナス要素ゼロ）。
// おとなモードの「0に もどす」でも減らさない（表示だけ 0 に もどす。下の resetShownStars）。
// 数字スコアではなく「集めた⭐の数」を貯める。
let starCache: number | null = null;

export function getTotalStars(): number {
  if (starCache !== null) return starCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(STAR_KEY);
      if (v != null) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0) return (starCache = n);
      }
    } catch {
      // 無視して既定（0）へ
    }
  }
  return (starCache = 0);
}

// n 個の⭐を加える（既定1）。新しい累計を返す。
// 加える前に控え（kotoba.starsResetAt）が今の累計より大きくないかを確かめる（下の discardStaleResetAt）。
// おとなモードもがんばりカードも開かずに遊んだときでも、累計が控えを越えた時点で表示が減って見えないようにするため。
export function addStars(n = 1): number {
  discardStaleResetAt();
  const next = getTotalStars() + Math.max(0, n);
  starCache = next;
  const store = ls();
  if (store) {
    try {
      store.setItem(STAR_KEY, String(next));
    } catch {
      // 保存できなくても遊びは壊さない（セッション内キャッシュは保持）
    }
  }
  return next;
}

// ── 「あつめた ほし」の表示（おとなモードの 0に もどす）─────────────────
// kotoba.totalStars は街（ぴよぴよランド）が読む燃料なので、0 に もどしても【意図的に残す】
// （街の ⭐ を減らさない。WORLD.md §3.3「⭐は絶対に減らない」、おつかいめいろ・ぴよぴよさんすうと同じ方針）。
// 0 に もどすのは ことばの中の表示だけ: もどした時点の累計を kotoba.starsResetAt に控え、
// 表示は「累計 − 控え」にする。控えが累計より大きい（累計だけ消えた・書き換えられた等）と分かったら、
// その控えは捨てる（キーを消し、0 として扱う＝控えの無い旧データと同じ表示「累計そのまま」）。
// 捨てずに無視するだけだと、累計が控えを越えた時点で表示が「累計 − 控え」に切り替わって減って見えていた
// （例: 累計 7・控え 9 → 表示 7、1セット後に累計 12 → 表示 3）。ぴよぴよさんすうと同じ扱い。
let resetAtCache: number | null = null;

function getStarsResetAt(): number {
  if (resetAtCache !== null) return resetAtCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(STAR_RESET_AT_KEY);
      if (v != null) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0) return (resetAtCache = n);
      }
    } catch {
      // 無視して既定（0）へ
    }
  }
  return (resetAtCache = 0);
}

// 控えを捨てる（キーを消す）。累計 kotoba.totalStars には触らない。
function discardStarsResetAt(): void {
  resetAtCache = 0;
  const store = ls();
  if (store) {
    try {
      store.removeItem(STAR_RESET_AT_KEY);
    } catch {
      // 消せなくても、同じ起動中はキャッシュ（0）で表示を保つ
    }
  }
}

// 控えが今の累計より大きければ捨てる。
function discardStaleResetAt(): void {
  if (getStarsResetAt() > getTotalStars()) discardStarsResetAt();
}

// おとなモード・がんばりカードに出す「あつめた ほし」の数。
export function getShownStars(): number {
  discardStaleResetAt();
  return getTotalStars() - getStarsResetAt();
}

// 「あつめた ほし」の表示を 0 に もどす（おとなモード専用・2段階確認の先）。累計 kotoba.totalStars は変えない。
export function resetShownStars(): void {
  const total = getTotalStars();
  resetAtCache = total;
  const store = ls();
  if (store) {
    try {
      store.setItem(STAR_RESET_AT_KEY, String(total));
    } catch {
      // 無視（同じ起動中はキャッシュで 0 表示を保つ）
    }
  }
}

// ── 有効カテゴリ（おとなモード）───────────────────────────────
// 既定は全4カテゴリ有効。空にはできない（最低1つは残す）。壊れた値は既定へ。
let catsCache: CategoryId[] | null = null;

function isCategoryId(v: unknown): v is CategoryId {
  return (
    v === "yasai" || v === "kudamono" || v === "doubutsu" || v === "norimono"
  );
}

export function getCategories(): CategoryId[] {
  if (catsCache !== null) return catsCache;
  const store = ls();
  if (store) {
    try {
      const raw = store.getItem(CATS_KEY);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // 既知idのみ・重複除去・順序は ALL_CATEGORIES に揃える。
          const set = new Set(parsed.filter(isCategoryId));
          const list = ALL_CATEGORIES.filter((c) => set.has(c));
          if (list.length >= 1) return (catsCache = list);
        }
      }
    } catch {
      // 無視して既定へ
    }
  }
  return (catsCache = [...ALL_CATEGORIES]);
}

// カテゴリ集合を保存する。空は受け付けない（最低1つ残す・安全側）。
export function setCategories(cats: CategoryId[]): CategoryId[] {
  const set = new Set(cats.filter(isCategoryId));
  const list = ALL_CATEGORIES.filter((c) => set.has(c));
  const next = list.length >= 1 ? list : [...ALL_CATEGORIES];
  catsCache = next;
  const store = ls();
  if (store) {
    try {
      store.setItem(CATS_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても遊びは壊さない
    }
  }
  return next;
}

// 1カテゴリのオン/オフ。最後の1つはオフにできない（空防止）。新しい集合を返す。
export function toggleCategory(id: CategoryId): CategoryId[] {
  const cur = getCategories();
  const on = cur.includes(id);
  if (on && cur.length === 1) return cur; // 最後の1つは消せない
  const next = on ? cur.filter((c) => c !== id) : [...cur, id];
  return setCategories(next);
}

// ── 読み上げ（TTS）オン/オフ ───────────────────────────────
// 既定は 'on'。壊れた値は既定へ。
let ttsCache: boolean | null = null;

export function getTtsOn(): boolean {
  if (ttsCache !== null) return ttsCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(TTS_KEY);
      if (v === "off") return (ttsCache = false);
      if (v === "on") return (ttsCache = true);
    } catch {
      // 無視して既定へ
    }
  }
  return (ttsCache = true);
}

export function setTtsOn(on: boolean): void {
  ttsCache = on;
  const store = ls();
  if (store) {
    try {
      store.setItem(TTS_KEY, on ? "on" : "off");
    } catch {
      // 無視
    }
  }
}

// ── BGM（オルゴール風の背景曲）オン/オフ ─────────────────────────
// 既定は 'on'（控えめ音量）。おとなモードのトグルから切り替える。壊れた値は既定へ。
// 読み上げ（tts）とは独立した設定。声の再生中はエンジン側で自動ダッキングする。
let bgmCache: boolean | null = null;

export function getBgmOn(): boolean {
  if (bgmCache !== null) return bgmCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(BGM_KEY);
      if (v === "off") return (bgmCache = false);
      if (v === "on") return (bgmCache = true);
    } catch {
      // 無視して既定へ
    }
  }
  return (bgmCache = true);
}

export function setBgmOn(on: boolean): void {
  bgmCache = on;
  const store = ls();
  if (store) {
    try {
      store.setItem(BGM_KEY, on ? "on" : "off");
    } catch {
      // 無視
    }
  }
}

// ── もじ表示（ひらがな / カタカナ / まぜがき）─────────────────────────
// 既定は 'hiragana'（今までどおり）。おとなモードの3択トグルから切り替える。壊れた値は既定へ。
// 表示ラベルだけに効く設定（読み上げ・SVG・ベルト挙動・⭐は不変）。
let mojiCache: MojiMode | null = null;

function isMojiMode(v: unknown): v is MojiMode {
  return v === "hiragana" || v === "katakana" || v === "mazegaki";
}

export function getMoji(): MojiMode {
  if (mojiCache !== null) return mojiCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(MOJI_KEY);
      if (isMojiMode(v)) return (mojiCache = v);
    } catch {
      // 無視して既定へ
    }
  }
  return (mojiCache = "hiragana");
}

export function setMoji(mode: MojiMode): void {
  const next = isMojiMode(mode) ? mode : "hiragana";
  mojiCache = next;
  const store = ls();
  if (store) {
    try {
      store.setItem(MOJI_KEY, next);
    } catch {
      // 保存できなくても遊びは壊さない
    }
  }
}
