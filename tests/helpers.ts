// テストの共通の道具: repo のルート・種つき乱数・偽の localStorage・settings.ts の読み直し。

import path from "node:path";
import {
  FakeStorage as PackageFakeStorage,
  installLocalStorage as installPackageLocalStorage,
  installThrowingLocalStorage,
} from "@kerokero-1245/piyo-assets/testing/storage";
import type { CategoryId } from "../src/types";

// repo のルート（assets/ を実際に開くのに使う）。
export const ROOT = path.resolve(import.meta.dirname, "..");

// 4 カテゴリの id（DESIGN §3 の並び）。出題・語データ・保存のテストが期待する値で、src の定数には頼らない。
export const CATEGORY_IDS: CategoryId[] = [
  "yasai",
  "kudamono",
  "doubutsu",
  "norimono",
];

// 資産（svg・音声）の require は、テストでは「資産ファイルの絶対パス」の文字列になる（tests/register.mjs）。
export function assetPath(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError(`資産のパスが文字列ではない: ${String(value)}`);
  }
  return value;
}

// ── 種つき乱数 ───────────────────────────────────────────────
// quiz.ts は Math.random を直に使う。テスト中だけ種つきの乱数（mulberry32）に差し替えると、
// 何度回しても同じ出題列になり、失敗したときに同じ種で再現できる。中身は piyo-assets の testing/random。
export {
  seededRandom,
  withSeed,
} from "@kerokero-1245/piyo-assets/testing/random";

// ── 偽の localStorage ────────────────────────────────────────
// 中身は piyo-assets の testing/storage。ここには、このアプリのテストの書き方に合わせる薄い包みだけを置く:
//   ・new FakeStorage(initial, { failReads, failWrites }) … 失敗のさせ方をコンストラクタの options で渡す
//     （failReads → getItem、failWrites → setItem と removeItem）
//   ・writes() … 書き込み（set / remove）の記録だけ
//   ・log の要素は key を必ず持つ形（settings.ts は clear を呼ばない）
//   ・installLocalStorage(descriptor) … { value } か { get }（触るだけで例外）の形の descriptor で置き換える
type BaseStorageCall = PackageFakeStorage["log"][number];
export type StorageCall = Exclude<BaseStorageCall, { op: "clear" }>;

export interface FakeStorageOptions {
  failReads?: boolean; // getItem が例外を投げる
  failWrites?: boolean; // setItem / removeItem が例外を投げる
}

export class FakeStorage extends PackageFakeStorage {
  declare readonly log: StorageCall[];

  constructor(
    initial: Record<string, string> = {},
    options: FakeStorageOptions = {},
  ) {
    super(initial);
    this.failGet = options.failReads === true;
    this.failSet = options.failWrites === true;
    this.failRemove = options.failWrites === true;
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
  if (descriptor.get !== undefined) return installThrowingLocalStorage();
  if ("value" in descriptor) {
    return installPackageLocalStorage(
      descriptor.value as PackageFakeStorage | undefined,
    );
  }
  throw new TypeError("installLocalStorage: { value } か { get } を渡す");
}

// ── settings.ts の読み直し ───────────────────────────────────
// settings.ts は読んだ値をモジュールの中に覚える（キャッシュ）。テストごとに白紙で始めるため、
// `?fresh=N` を付けて別のインスタンスとして読み込む（tests/register.mjs が末尾をそのまま通す）。
export type Settings = typeof import("../src/settings");
let freshCount = 0;
export async function freshSettings(): Promise<Settings> {
  freshCount += 1;
  return (await import(`../src/settings.ts?fresh=${freshCount}`)) as Settings;
}
