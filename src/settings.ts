// 端末内の保存もの（DESIGN §9・WORLD §7 準拠）。すべて `kotoba.` プレフィックス。
// - あつめた ほし の累計（totalStars）… ごほうび（スタンプ）のコレクション。街の燃料（やおやさん）に合流。
// - 有効カテゴリ（cats）… おとなモードのオン/オフ。空にはできない（最低1つ）。
// - 読み上げ（tts）… おとなモードのオン/オフ。
// web は localStorage に保存、native はセッション内キャッシュのみ（MVP）。外部送信なし。
// 取得失敗時は既定値にフォールバック。消えても遊びは壊れない（罰・失敗表示はしない）。
// 他アプリ・街のキー（meiro.* sansu.* land.*）は読み書き禁止。書いてよいのは kotoba.* のみ。

import { Platform } from 'react-native';
import { CategoryId } from './types';

const STAR_KEY = 'kotoba.totalStars';
const CATS_KEY = 'kotoba.cats';
const TTS_KEY = 'kotoba.tts';

export const ALL_CATEGORIES: CategoryId[] = ['yasai', 'kudamono', 'doubutsu', 'norimono'];

// 型の都合で最小限だけ宣言（DOM lib に依存しない）。
interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function ls(): WebStorage | null {
  if (Platform.OS !== 'web') return null;
  try {
    const s = (globalThis as unknown as { localStorage?: WebStorage }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

// ── あつめた ほし（累計スタンプ）───────────────────────────────
// 1問クリアごとに +1 する“ごほうび”の合計。減ることはない（マイナス要素ゼロ）。
// リセットはおとなモードからのみ。数字スコアではなく「集めた⭐の数」を貯める。
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
export function addStars(n = 1): number {
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

// 累計を0に戻す（おとなモード専用・2段階確認の先）。
export function resetStars(): void {
  starCache = 0;
  const store = ls();
  if (store) {
    try {
      store.setItem(STAR_KEY, '0');
    } catch {
      // 無視
    }
  }
}

// ── 有効カテゴリ（おとなモード）───────────────────────────────
// 既定は全4カテゴリ有効。空にはできない（最低1つは残す）。壊れた値は既定へ。
let catsCache: CategoryId[] | null = null;

function isCategoryId(v: unknown): v is CategoryId {
  return v === 'yasai' || v === 'kudamono' || v === 'doubutsu' || v === 'norimono';
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
      if (v === 'off') return (ttsCache = false);
      if (v === 'on') return (ttsCache = true);
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
      store.setItem(TTS_KEY, on ? 'on' : 'off');
    } catch {
      // 無視
    }
  }
}