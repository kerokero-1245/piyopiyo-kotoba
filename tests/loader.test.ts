// 読み込みの仕組み（tests/register.mjs）自身の検査。ほかのテストが src を「たまたま」読めているのではなく、
// 仕組みが次を受け持っていることを 1 つずつ確かめる:
//   .tsx（JSX）の変換 / ディレクトリ指定（index.ts）/ `?fresh=N` で別インスタンス /
//   react-native・expo の代用品 / svg・音声の require の置き換え / 構文エラーを黙って通さない。

import assert from "node:assert/strict";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { ROOT, freshSettings } from "./helpers";
import { Platform as StubPlatform } from "./stubs/react-native";

test(".tsx を JSX ごと読める", async () => {
  const { Hello } = await import("./fixtures/Hello");
  const element = Hello({ name: "ことば" });
  assert.equal(element.type, "p");
  assert.deepEqual(element.props, { children: ["こんにちは、", "ことば"] });
});

test("ディレクトリ指定の import は index.ts を読む", async () => {
  const { marker } = await import("./fixtures/dir");
  assert.equal(marker, "dir/index.ts");
});

test("`?fresh=N` を付けて読むと、別の状態を持つインスタンスになる", async () => {
  const a = await freshSettings();
  const b = await freshSettings();
  a.setTtsOn(false);
  assert.equal(a.getTtsOn(), false);
  assert.equal(b.getTtsOn(), true);
});

test("react-native は tests/stubs の代用品（Platform.OS は web）", async () => {
  const { Platform } = await import("react-native");
  assert.equal(Platform, StubPlatform);
  assert.equal(Platform.OS, "web");
});

test("expo / expo-* は空の代用品", async () => {
  assert.deepEqual(Object.keys(await import("expo")), []);
  assert.deepEqual(Object.keys(await import("expo-status-bar")), []);
});

test("svg の require は、その資産ファイルの絶対パスの文字列になる", async () => {
  const { WORDS } = await import("../src/game/words");
  assert.equal(WORDS[0].svg, path.join(ROOT, "assets/svg/ninjin.svg"));
});

test("構文エラーのファイルは、黙って壊れた JS にせず SyntaxError で止まる", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "kotoba-loader-"));
  const file = path.join(dir, "broken.ts");
  writeFileSync(file, "export const x = ;\n");
  t.after(() => {
    unlinkSync(file);
    rmdirSync(dir);
  });
  await assert.rejects(
    import(pathToFileURL(file).href),
    (error: unknown) =>
      error instanceof SyntaxError && error.message.includes("broken.ts"),
  );
});
