// react-native の代用品（テスト用）。いま読んでいる src が react-native から使うのは Platform.OS だけ
// （settings.ts と audio/*）。web 前提の値にしてあり、native の経路を確かめるテストはこの OS を
// 書き換えて、終わったら "web" に戻す。View や Text などの部品は用意していない（画面は読まない）。
// 読む src が増えたら、必要な名前だけここへ足す。
export const Platform: { OS: string } = { OS: "web" };
