// テストの共通の道具: repo のルート・種つき乱数・偽の localStorage・settings.ts の読み直し。

import path from "node:path";

// repo のルート（assets/ を実際に開くのに使う）。
export const ROOT = path.resolve(import.meta.dirname, "..");

// 資産（svg・音声）の require は、テストでは「資産ファイルの絶対パス」の文字列になる（tests/register.mjs）。
export function assetPath(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError(`資産のパスが文字列ではない: ${String(value)}`);
  }
  return value;
}

// ── 種つき乱数 ───────────────────────────────────────────────
// quiz.ts は Math.random を直に使う。テスト中だけ種つきの乱数（mulberry32）に差し替えると、
// 何度回しても同じ出題列になり、失敗したときに同じ種で再現できる。
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fn の間だけ Math.random を種つきにする（終わったら必ず元へ戻す）。
export function withSeed<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = seededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

// ── 偽の localStorage ────────────────────────────────────────
// settings.ts が使うのは getItem / setItem / removeItem だけ。どのキーを読み書きしたかを log に残す。
export interface StorageCall {
  op: "get" | "set" | "remove";
  key: string;
  value?: string;
}

export interface FakeStorageOptions {
  failReads?: boolean; // getItem が例外を投げる
  failWrites?: boolean; // setItem / removeItem が例外を投げる
}

export class FakeStorage {
  readonly data: Map<string, string>;
  readonly log: StorageCall[] = [];

  constructor(
    initial: Record<string, string> = {},
    private readonly options: FakeStorageOptions = {},
  ) {
    this.data = new Map(Object.entries(initial));
  }

  getItem(key: string): string | null {
    this.log.push({ op: "get", key });
    if (this.options.failReads) throw new Error("storage: read failed");
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.log.push({ op: "set", key, value });
    if (this.options.failWrites) throw new Error("storage: write failed");
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.log.push({ op: "remove", key });
    if (this.options.failWrites) throw new Error("storage: remove failed");
    this.data.delete(key);
  }

  // 保存されている中身を { キー: 値 } で返す。
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.data);
  }

  // 書き込み（set / remove）の記録だけを取り出す。
  writes(): StorageCall[] {
    return this.log.filter((call) => call.op !== "get");
  }
}

// globalThis.localStorage を差し替える。戻り値を呼ぶと元の状態へ戻る（t.after に渡す）。
export function installLocalStorage(
  descriptor: PropertyDescriptor,
): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    ...descriptor,
    configurable: true,
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  };
}

// ── settings.ts の読み直し ───────────────────────────────────
// settings.ts は読んだ値をモジュールの中に覚える（キャッシュ）。テストごとに白紙で始めるため、
// `?fresh=N` を付けて別のインスタンスとして読み込む（tests/register.mjs が末尾をそのまま通す）。
let freshCount = 0;
export async function freshSettings(): Promise<
  typeof import("../src/settings")
> {
  freshCount += 1;
  return (await import(
    `../src/settings.ts?fresh=${freshCount}`
  )) as typeof import("../src/settings");
}
