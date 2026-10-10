// 出題ロジック（src/game/quiz.ts）の約束（DESIGN §3）を、現状のまま固定する。
//   ・選択肢に answer が 1 つだけ含まれる / 同じ語は並ばない
//   ・選択肢の数 K = min(4, 有効カテゴリ数)。有効 1 カテゴリだけのときは、同カテゴリの 4 語
//   ・複数カテゴリなら各カテゴリから最大 1 語
//   ・🍎りんご と 🍅とまと は同じ問題に並ばない
//   ・generateSet は 5 問で 1 セット。連続する 2 問の正解語は同じにならない（avoidWord）
// quiz.ts は Math.random を使うので、テスト中だけ種つきの乱数にして結果を再現できるようにしている（失敗の表示に種を出す）。

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { generateQuestion, generateSet } from "../src/game/quiz";
import { WORDS } from "../src/game/words";
import type { CategoryId, Question } from "../src/types";
import { CATEGORY_IDS, withSeed } from "./helpers";

// 有効カテゴリの空でない組み合わせ 15 通り（2^4 - 1）。各組み合わせは CATEGORY_IDS の並びのまま。
const COMBOS: CategoryId[][] = Array.from({ length: 15 }, (_, n) =>
  CATEGORY_IDS.filter((_cat, bit) => ((n + 1) >> bit) & 1),
);

const ROUNDS = 300; // 組み合わせごとに回す問題数

// 見た目が紛らわしい 🍎りんご（くだもの）と 🍅とまと（やさい）。
const RINGO = "🍎";
const TOMATO = "🍅";
const mixesRingoAndTomato = (q: Question): boolean => {
  const emojis = q.choices.map((c) => c.emoji);
  return emojis.includes(RINGO) && emojis.includes(TOMATO);
};

const label = (cats: CategoryId[]): string => cats.join("+");

// 型の外の値（知らない id）を渡すテスト用。
const unsafeCats = (...ids: string[]): CategoryId[] => ids as CategoryId[];

// 1 問が DESIGN §3 の約束を満たすことを確かめる。where は失敗の表示用。
function checkQuestion(q: Question, active: CategoryId[], where: string): void {
  const ids = q.choices.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, `${where}: 同じ語が並ぶ ${ids}`);
  assert.equal(
    q.choices.filter((c) => c === q.answer).length,
    1,
    `${where}: answer が選択肢に 1 つだけ入っていない`,
  );
  // 選択肢の数: 有効 1 カテゴリなら 4 語（そのカテゴリは 10 語ある）、複数なら有効カテゴリの数（最大 4）。
  const expectedK = active.length === 1 ? 4 : Math.min(4, active.length);
  assert.equal(q.choices.length, expectedK, `${where}: 選択肢の数`);
  for (const c of q.choices) {
    assert.ok(
      active.includes(c.category),
      `${where}: 有効でない ${c.category}`,
    );
  }
  if (active.length > 1) {
    const cats = q.choices.map((c) => c.category);
    assert.equal(
      new Set(cats).size,
      cats.length,
      `${where}: 同じカテゴリが 2 語`,
    );
  }
  assert.ok(!mixesRingoAndTomato(q), `${where}: 🍎と🍅が同じ問題に並んだ`);
}

describe("generateQuestion: 有効カテゴリの全組み合わせ", () => {
  test("組み合わせは 15 通り", () => {
    assert.equal(COMBOS.length, 15);
    assert.equal(new Set(COMBOS.map((cats) => cats.join())).size, 15);
  });

  COMBOS.forEach((cats, index) => {
    const seed = 1000 + index;
    test(`${cats.join(" + ")}: ${ROUNDS} 問すべてが約束を満たす（種 ${seed}）`, () => {
      withSeed(seed, () => {
        for (let i = 0; i < ROUNDS; i++) {
          checkQuestion(generateQuestion(cats), cats, `${i + 1} 問目`);
        }
      });
    });
  });

  test("有効 1 カテゴリでは、4 カテゴリのどれでも同カテゴリの 4 語になる", () => {
    withSeed(2000, () => {
      for (const cat of CATEGORY_IDS) {
        for (let i = 0; i < 50; i++) {
          const q = generateQuestion([cat]);
          assert.equal(q.choices.length, 4, cat);
          assert.ok(
            q.choices.every((c) => c.category === cat),
            `${cat}: 別カテゴリが混ざった`,
          );
        }
      }
    });
  });
});

describe("generateQuestion: 偏りと紛らわしさ", () => {
  test("全カテゴリ有効なら、40 語のどれもが正解になる", () => {
    const seen = new Set<string>();
    withSeed(3000, () => {
      for (let i = 0; i < 4000; i++) {
        seen.add(generateQuestion(CATEGORY_IDS).answer.id);
      }
    });
    assert.equal(seen.size, WORDS.length);
  });

  test("正解の位置は選択肢の中でばらける（シャッフルされる）", () => {
    const counts = [0, 0, 0, 0];
    withSeed(3001, () => {
      for (let i = 0; i < 2000; i++) {
        const q = generateQuestion(CATEGORY_IDS);
        counts[q.choices.indexOf(q.answer)] += 1;
      }
    });
    for (const count of counts) {
      assert.ok(count > 2000 * 0.18, `正解の位置が偏っている ${counts}`);
    }
  });

  test("🍎と🍅は同じ問題に並ばない（やさいとくだものが両方有効な 4 組み合わせ）", () => {
    const combos = COMBOS.filter(
      (cats) => cats.includes("yasai") && cats.includes("kudamono"),
    );
    assert.equal(combos.length, 4);
    let ringoAnswers = 0;
    let tomatoAnswers = 0;
    withSeed(3002, () => {
      for (const cats of combos) {
        for (let i = 0; i < 1000; i++) {
          const q = generateQuestion(cats);
          if (q.answer.emoji === RINGO) ringoAnswers += 1;
          if (q.answer.emoji === TOMATO) tomatoAnswers += 1;
          assert.ok(
            !mixesRingoAndTomato(q),
            `${label(cats)} ${i + 1} 問目: ${q.choices.map((c) => c.emoji).join("")}`,
          );
        }
      }
    });
    // 🍎や🍅が正解の問題を十分に含んでいる（含まないと、並ばないことを確かめたことにならない）。
    assert.ok(
      ringoAnswers >= 30,
      `🍎が正解の問題が ${ringoAnswers} 問しかない`,
    );
    assert.ok(
      tomatoAnswers >= 30,
      `🍅が正解の問題が ${tomatoAnswers} 問しかない`,
    );
  });

  test("同じ種なら同じ出題になる（Math.random だけに頼る）", () => {
    const ids = (seed: number) =>
      withSeed(seed, () =>
        generateSet(CATEGORY_IDS).map((q) => q.choices.map((c) => c.id)),
      );
    assert.deepEqual(ids(42), ids(42));
    assert.notDeepEqual(ids(42), ids(43));
  });
});

describe("generateQuestion: avoidWord", () => {
  test("avoidWord に渡した語は正解にならない（全 15 通り × 40 語 × 5 回）", () => {
    withSeed(4000, () => {
      for (const cats of COMBOS) {
        for (const w of WORDS) {
          for (let i = 0; i < 5; i++) {
            const q = generateQuestion(cats, w.word);
            assert.notEqual(q.answer.word, w.word, `${label(cats)} ${w.id}`);
          }
        }
      }
    });
  });
});

describe("generateSet", () => {
  test("既定は 5 問。数を渡せる", () => {
    withSeed(5000, () => {
      assert.equal(generateSet(CATEGORY_IDS).length, 5);
      assert.equal(generateSet(CATEGORY_IDS, 3).length, 3);
      assert.equal(generateSet(CATEGORY_IDS, 0).length, 0);
    });
  });

  test("連続する 2 問の正解語が同じにならない（全 15 通り × 100 セット）", () => {
    withSeed(5001, () => {
      for (const cats of COMBOS) {
        for (let n = 0; n < 100; n++) {
          const set = generateSet(cats);
          assert.equal(set.length, 5);
          set.forEach((q, i) => {
            checkQuestion(
              q,
              cats,
              `${label(cats)} セット${n + 1} ${i + 1} 問目`,
            );
            if (i > 0) {
              assert.notEqual(
                q.answer.word,
                set[i - 1].answer.word,
                `${label(cats)} セット${n + 1}: ${i} 問目と ${i + 1} 問目の正解が同じ`,
              );
            }
          });
        }
      }
    });
  });
});

describe("generateQuestion: 有効カテゴリの正規化（入口）", () => {
  // 返ってきた選択肢のカテゴリを、並びに関係なく比べる。
  const categoriesOf = (q: Question) => q.choices.map((c) => c.category).sort();
  const SORTED_IDS = [...CATEGORY_IDS].sort();

  test("空なら全カテゴリ扱い（4 択・4 カテゴリが 1 語ずつ）", () => {
    withSeed(6000, () => {
      for (let i = 0; i < 50; i++) {
        assert.deepEqual(categoriesOf(generateQuestion([])), SORTED_IDS);
      }
    });
  });

  test("同じカテゴリを重ねて渡しても 1 つ分（有効 1 カテゴリの出題になる）", () => {
    withSeed(6001, () => {
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion(["yasai", "yasai", "yasai"]);
        assert.equal(q.choices.length, 4);
        assert.ok(q.choices.every((c) => c.category === "yasai"));
      }
    });
  });

  test("知らない id は無視する。すべて知らない id なら全カテゴリ扱い", () => {
    withSeed(6002, () => {
      for (let i = 0; i < 50; i++) {
        assert.deepEqual(
          categoriesOf(generateQuestion(unsafeCats("bogus"))),
          SORTED_IDS,
        );
        const q = generateQuestion(unsafeCats("bogus", "kudamono"));
        assert.equal(q.choices.length, 4);
        assert.ok(q.choices.every((c) => c.category === "kudamono"));
      }
    });
  });

  test("渡す順番は関係ない", () => {
    withSeed(6003, () => {
      for (let i = 0; i < 50; i++) {
        assert.deepEqual(
          categoriesOf(generateQuestion(["norimono", "yasai"])),
          ["norimono", "yasai"],
        );
      }
    });
  });
});
