// ESLint の設定（flat config）。Expo の設定（eslint-config-expo）を使い、規則の追加はしない。
// 無効化は react-hooks/refs の 1 つだけ（理由は下）。
import { defineConfig, globalIgnores } from "eslint/config";
// 拡張子なしの "eslint-config-expo/flat" は、同名のフォルダ flat/ があるので ESM からは読めない。
import expoConfig from "eslint-config-expo/flat.js";
import { createRequire } from "node:module";

// eslint-config-expo は React の版を "detect" にしている。eslint-plugin-react 7.37 の detect は
// ESLint 10 で消えた context.getFilename() を呼んで落ちるので、入っている react の版を渡す。
const reactVersion = createRequire(import.meta.url)(
  "react/package.json",
).version;

// eslint-config-expo が使う eslint-import-resolver-typescript は、eslint-plugin-import の peer が
// eslint 9 までなので、npm が eslint-config-expo の下の入れ子に置き、プロジェクト直下から見つからない
// （見つからないと "typescript with invalid interface loaded as resolver" で落ちる）。
// そのため package.json の devDependencies に直接入れて直下に置いている（版は入れ子にあった 3.10.1）。

export default defineConfig([
  expoConfig,
  { settings: { react: { version: reactVersion } } },
  {
    // react-hooks/refs は、プラグイン（eslint-plugin-react-hooks 7）の README が "React Compiler rules" に
    // 分類している規則。この repo は React Compiler を使わない（expo の設定に experiments.reactCompiler がない）。
    // 一方、Animated.Value は 9 か所すべて useRef(...).current で作っている（RN の定番の形）。
    // この規則はその宣言と、値を描画で使う行（interpolate・style・依存配列）を「描画中に ref を読む」と見なし、
    // 導入時に 48 件（23 行・6 ファイル）出た。うち 3 行（ClearOverlay の useRef(getShownStars()).current と、
    // PlayScreen の catsRef.current・mojiRef.current）だけは別の形（マウント時に固定する値を ref に持つ）。
    // この repo の書き方に合わない規則なので off にする。
    rules: { "react-hooks/refs": "off" },
  },
  // 依存・生成物・書き出し先は検査しない（.gitignore の同名の項目と同じ）。
  globalIgnores([
    "node_modules/",
    "dist/",
    ".expo/",
    "web-build/",
    "ios/",
    "android/",
    "expo-env.d.ts",
  ]),
]);
