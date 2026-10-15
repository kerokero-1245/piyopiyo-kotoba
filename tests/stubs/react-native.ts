// react-native の代用品（テスト用）。中身は piyo-assets の既定の差し替え（Platform.OS は "web" から始まる）。
// いま読んでいる src が react-native から使うのは Platform.OS だけ（settings.ts と audio/*）で、
// native の経路を確かめるテストはこの OS を書き換えて、終わったら "web" に戻す。
// このアプリだけが使う名前が要るようになったら、下に足す。
export * from "@kerokero-1245/piyo-assets/testing/stubs/react-native";
