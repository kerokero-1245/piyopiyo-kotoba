// expo / expo-* の代用品（テスト用）。いま読んでいる src（出題・語データ・保存・クリップ表）は
// expo を import しないので空。piyo-assets の既定の差し替え（testing/stubs/expo の StatusBar）は取り込まない
// （tests/loader.test.ts が「expo / expo-* は空の代用品」を検査している）。
// App.tsx などを読むテストを足すときに、必要な名前だけここへ足す
// （名前が足りないと「does not provide an export named …」で止まるので、足す場所はすぐ分かる）。
export {};
