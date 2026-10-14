// 語データ（src/game/words.ts）と、もじ表示の純関数（toKatakana / displayWord）の現状を固定する。
// DESIGN §3: 4 カテゴリ × 10 語 = 40 語 / word・emoji は全語で一意 / 「まぜがき」でカタカナにする語は 11 語 /
// ひらがな → カタカナは U+3041..U+3096 を +0x60 する機械変換。

import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import {
  CATEGORY_LABELS,
  WORDS,
  displayWord,
  toKatakana,
  wordsByCategory,
} from "../src/game/words";
import type { CategoryId, MojiMode } from "../src/types";
import { CATEGORY_IDS, ROOT, assetPath } from "./helpers";

type Row = readonly [
  id: string,
  emoji: string,
  word: string,
  category: CategoryId,
  katakanaNatural: boolean,
  katakana: string, // toKatakana(word) の期待値（Unicode 名の置換で別に検算した）
];

// 現状の 40 語。語を足す・直すときは、ここも一緒に直す（意図しない変更をここで止める）。
// prettier-ignore
const GOLDEN: readonly Row[] = [
  ["ninjin", "🥕", "にんじん", "yasai", false, "ニンジン"],
  ["tomato", "🍅", "とまと", "yasai", true, "トマト"],
  ["nasu", "🍆", "なす", "yasai", false, "ナス"],
  ["toumorokoshi", "🌽", "とうもろこし", "yasai", false, "トウモロコシ"],
  ["piiman", "🫑", "ぴーまん", "yasai", true, "ピーマン"],
  ["kyuuri", "🥒", "きゅうり", "yasai", false, "キュウリ"],
  ["jagaimo", "🥔", "じゃがいも", "yasai", false, "ジャガイモ"],
  ["satsumaimo", "🍠", "さつまいも", "yasai", false, "サツマイモ"],
  ["tamanegi", "🧅", "たまねぎ", "yasai", false, "タマネギ"],
  ["burokkorii", "🥦", "ぶろっこりー", "yasai", true, "ブロッコリー"],
  ["banana", "🍌", "ばなな", "kudamono", true, "バナナ"],
  ["ringo", "🍎", "りんご", "kudamono", false, "リンゴ"],
  ["ichigo", "🍓", "いちご", "kudamono", false, "イチゴ"],
  ["budou", "🍇", "ぶどう", "kudamono", false, "ブドウ"],
  ["mikan", "🍊", "みかん", "kudamono", false, "ミカン"],
  ["suika", "🍉", "すいか", "kudamono", false, "スイカ"],
  ["momo", "🍑", "もも", "kudamono", false, "モモ"],
  ["sakuranbo", "🍒", "さくらんぼ", "kudamono", false, "サクランボ"],
  ["meron", "🍈", "めろん", "kudamono", true, "メロン"],
  ["painappuru", "🍍", "ぱいなっぷる", "kudamono", true, "パイナップル"],
  ["inu", "🐶", "いぬ", "doubutsu", false, "イヌ"],
  ["neko", "🐱", "ねこ", "doubutsu", false, "ネコ"],
  ["usagi", "🐰", "うさぎ", "doubutsu", false, "ウサギ"],
  ["zou", "🐘", "ぞう", "doubutsu", false, "ゾウ"],
  ["raion", "🦁", "らいおん", "doubutsu", true, "ライオン"],
  ["kirin", "🦒", "きりん", "doubutsu", false, "キリン"],
  ["panda", "🐼", "ぱんだ", "doubutsu", true, "パンダ"],
  ["saru", "🐵", "さる", "doubutsu", false, "サル"],
  ["kuma", "🐻", "くま", "doubutsu", false, "クマ"],
  ["buta", "🐷", "ぶた", "doubutsu", false, "ブタ"],
  ["kuruma", "🚗", "くるま", "norimono", false, "クルマ"],
  ["basu", "🚌", "ばす", "norimono", true, "バス"],
  ["densha", "🚃", "でんしゃ", "norimono", false, "デンシャ"],
  ["hikouki", "✈️", "ひこうき", "norimono", false, "ヒコウキ"],
  ["fune", "🚢", "ふね", "norimono", false, "フネ"],
  ["shoubousha", "🚒", "しょうぼうしゃ", "norimono", false, "ショウボウシャ"],
  ["kyuukyuusha", "🚑", "きゅうきゅうしゃ", "norimono", false, "キュウキュウシャ"],
  ["jitensha", "🚲", "じてんしゃ", "norimono", false, "ジテンシャ"],
  ["herikoputaa", "🚁", "へりこぷたー", "norimono", true, "ヘリコプター"],
  ["roketto", "🚀", "ろけっと", "norimono", true, "ロケット"],
];

// DESIGN §3 の「現在の katakanaNatural: true（11語）」。まぜがきでカタカナになる語（掲載の順）。
const NATURAL_KATAKANA = [
  "トマト",
  "ピーマン",
  "ブロッコリー",
  "バナナ",
  "メロン",
  "パイナップル",
  "ライオン",
  "パンダ",
  "バス",
  "ヘリコプター",
  "ロケット",
];

const duplicates = (values: string[]): string[] =>
  values.filter((value, i) => values.indexOf(value) !== i);

describe("語データ", () => {
  test("40 語あり、4 カテゴリ × 10 語", () => {
    assert.equal(WORDS.length, 40);
    for (const id of CATEGORY_IDS) {
      assert.equal(wordsByCategory(id).length, 10, `${id} の語数`);
    }
    assert.equal(
      CATEGORY_IDS.reduce((sum, id) => sum + wordsByCategory(id).length, 0),
      WORDS.length,
      "どのカテゴリにも入らない語がある",
    );
  });

  test("id・emoji・word はそれぞれ全語で一意", () => {
    assert.deepEqual(duplicates(WORDS.map((w) => w.id)), [], "id の重複");
    assert.deepEqual(duplicates(WORDS.map((w) => w.emoji)), [], "emoji の重複");
    assert.deepEqual(duplicates(WORDS.map((w) => w.word)), [], "word の重複");
  });

  test("id・emoji・word・category・katakanaNatural が現状の 40 語の表と一致する", () => {
    assert.deepEqual(
      WORDS.map((w) => [w.id, w.emoji, w.word, w.category, w.katakanaNatural]),
      GOLDEN.map(([id, emoji, word, category, natural]) => [
        id,
        emoji,
        word,
        category,
        natural,
      ]),
    );
  });

  test("wordsByCategory は、そのカテゴリの語を WORDS の並びのまま返す", () => {
    for (const id of CATEGORY_IDS) {
      assert.deepEqual(
        wordsByCategory(id).map((w) => w.id),
        GOLDEN.filter((row) => row[3] === id).map((row) => row[0]),
        id,
      );
    }
  });

  test("カテゴリの表示ラベルと絵文字（DESIGN §3 の表）", () => {
    assert.deepEqual(CATEGORY_LABELS, {
      yasai: { label: "やさい", emoji: "🥕" },
      kudamono: { label: "くだもの", emoji: "🍓" },
      doubutsu: { label: "どうぶつ", emoji: "🐰" },
      norimono: { label: "のりもの", emoji: "🚗" },
    });
  });

  test("id は半角英小文字だけ（クリップ・SVG の基名に使う）", () => {
    for (const w of WORDS) assert.match(w.id, /^[a-z]+$/, w.word);
  });

  test("svg は assets/svg/<id>.svg を指し、空でないファイルが実在する", () => {
    for (const w of WORDS) {
      const file = assetPath(w.svg);
      assert.equal(file, path.join(ROOT, "assets/svg", `${w.id}.svg`), w.id);
      assert.ok(statSync(file).size > 0, `${w.id}.svg が空`);
    }
  });

  test("assets/svg の svg は 40 語の分だけ", () => {
    const files = readdirSync(path.join(ROOT, "assets/svg"))
      .filter((name) => name.endsWith(".svg"))
      .map((name) => name.slice(0, -".svg".length))
      .sort();
    assert.deepEqual(files, WORDS.map((w) => w.id).sort());
  });
});

describe("まぜがきの語（katakanaNatural）", () => {
  test("true は 11 語で、DESIGN §3 の一覧と同じ", () => {
    const natural = WORDS.filter((w) => w.katakanaNatural);
    assert.equal(natural.length, 11);
    assert.deepEqual(
      natural.map((w) => displayWord(w, "mazegaki")),
      NATURAL_KATAKANA,
    );
  });
});

describe("toKatakana", () => {
  test("ひらがな U+3041..U+3096 は +0x60 でカタカナ U+30A1..U+30F6 になる", () => {
    for (let code = 0x3041; code <= 0x3096; code++) {
      assert.equal(
        toKatakana(String.fromCodePoint(code)),
        String.fromCodePoint(code + 0x60),
        `U+${code.toString(16)}`,
      );
    }
  });

  test("両端の字: ぁ → ァ、ゖ → ヶ", () => {
    assert.equal(toKatakana("ぁ"), "ァ");
    assert.equal(toKatakana("ゖ"), "ヶ");
  });

  test("清音・濁音・半濁音・小書き・っ・ゔ", () => {
    assert.equal(toKatakana("あいうえお"), "アイウエオ");
    assert.equal(toKatakana("がぎぐげござじずぜぞ"), "ガギグゲゴザジズゼゾ");
    assert.equal(toKatakana("ぱぴぷぺぽ"), "パピプペポ");
    assert.equal(toKatakana("ゃゅょっぁぃぅぇぉゎ"), "ャュョッァィゥェォヮ");
    assert.equal(toKatakana("ゔ"), "ヴ");
  });

  test("範囲の外はそのまま通す（長音符・中黒・カタカナ・英数・漢字・空白・記号・絵文字）", () => {
    for (const s of [
      "ー",
      "・",
      "カタカナ",
      "abcXYZ019",
      "漢字",
      " ",
      "？",
      "🍎",
      String.fromCodePoint(0x3040), // ぁ の 1 つ前
      String.fromCodePoint(0x3097), // ゖ の 1 つ後
    ]) {
      assert.equal(toKatakana(s), s);
    }
  });

  test("長音符つきの語: ぴーまん → ピーマン、ぶろっこりー → ブロッコリー", () => {
    assert.equal(toKatakana("ぴーまん"), "ピーマン");
    assert.equal(toKatakana("ぶろっこりー"), "ブロッコリー");
  });

  test("空文字は空文字。混ざっていても範囲の字だけ変える", () => {
    assert.equal(toKatakana(""), "");
    assert.equal(toKatakana("りんご🍎a1"), "リンゴ🍎a1");
    assert.equal(toKatakana("は どれ？"), "ハ ドレ？");
  });

  test("もう一度かけても同じ（40 語）", () => {
    for (const w of WORDS) {
      assert.equal(toKatakana(toKatakana(w.word)), toKatakana(w.word), w.id);
    }
  });
});

describe("displayWord（3 モード × 40 語）", () => {
  const MODES: MojiMode[] = ["hiragana", "katakana", "mazegaki"];

  test("hiragana は word のまま、katakana は全部カタカナ、mazegaki は katakanaNatural の語だけカタカナ", () => {
    for (const [id, , word, , natural, katakana] of GOLDEN) {
      const item = WORDS.find((w) => w.id === id);
      assert.ok(item, `${id} が WORDS に無い`);
      assert.equal(displayWord(item, "hiragana"), word, `${id} hiragana`);
      assert.equal(displayWord(item, "katakana"), katakana, `${id} katakana`);
      assert.equal(
        displayWord(item, "mazegaki"),
        natural ? katakana : word,
        `${id} mazegaki`,
      );
    }
  });

  test("まぜがきで変わるのは 11 語だけ（残りの 29 語はひらがなのまま）", () => {
    const changed = WORDS.filter((w) => displayWord(w, "mazegaki") !== w.word);
    assert.equal(changed.length, 11);
    assert.equal(WORDS.length - changed.length, 29);
  });

  test("表示を作っても word 本体（読み上げ・同一性に使う）は変わらない", () => {
    const before = WORDS.map((w) => w.word);
    for (const mode of MODES) for (const w of WORDS) displayWord(w, mode);
    assert.deepEqual(
      WORDS.map((w) => w.word),
      before,
    );
  });
});
