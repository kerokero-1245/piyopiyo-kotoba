// node --test の読み込み（`--import ./tests/register.mjs`。package.json の test）。
// 中身は piyo-assets のひな形 `@kerokero-1245/piyo-assets/testing/register`
// （.ts・.tsx の変換・拡張子なしの import の補完・`?fresh=N` の素通し・JSON・素材の require・
//  react-native と expo の差し替え）で、ここにはこのアプリの差分だけを書く。
//  - react-native は tests/stubs/react-native.ts、expo・expo-* は空の tests/stubs/expo.ts
//  - svg・音声の require は、ひな形の既定（その素材ファイルの絶対パスの文字列。実在を検査できる）
import { register } from "@kerokero-1245/piyo-assets/testing/register";

const expo = new URL("./stubs/expo.ts", import.meta.url);

register({
  root: new URL("../", import.meta.url),
  stubs: {
    "react-native": new URL("./stubs/react-native.ts", import.meta.url),
    expo,
    "expo-*": expo,
    "expo/*": expo,
  },
});
