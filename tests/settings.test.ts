// 端末内の保存（src/settings.ts）の規則と保存キーを、現状のまま固定する（DESIGN §9・§14）。
//   ・キーはすべて `kotoba.` で始まる 6 つだけ（他アプリ・街の meiro.* sansu.* land.* は読み書きしない）
//   ・累計 kotoba.totalStars は減らさない / 控え kotoba.starsResetAt は「0に もどす」の時点の累計
//     （控えが累計より大きければ捨てる）/ 有効カテゴリは正規の並び（やさい・くだもの・どうぶつ・のりもの）・最低 1 つ / 壊れた値は既定
// localStorage は偽物に差し替える。settings.ts は読んだ値を覚えるので、テストごとに読み直す（tests/helpers.ts）。

import assert from "node:assert/strict";
import { describe, test, type TestContext } from "node:test";
import type { CategoryId, MojiMode } from "../src/types";
import {
  CATEGORY_IDS,
  FakeStorage,
  freshSettings,
  installLocalStorage,
  type FakeStorageOptions,
  type Settings,
} from "./helpers";
import { Platform } from "./stubs/react-native";

const KEY = {
  totalStars: "kotoba.totalStars",
  starsResetAt: "kotoba.starsResetAt",
  cats: "kotoba.cats",
  moji: "kotoba.moji",
  tts: "kotoba.tts",
  bgm: "kotoba.bgm",
};

// 偽の localStorage を入れて、白紙の settings を読み込む。終わると元に戻る。
async function setup(
  t: TestContext,
  initial: Record<string, string> = {},
  options: FakeStorageOptions = {},
) {
  const storage = new FakeStorage(initial, options);
  t.after(installLocalStorage({ value: storage, writable: true }));
  return { storage, settings: await freshSettings() };
}

describe("あつめた ほし（kotoba.totalStars・kotoba.starsResetAt）", () => {
  test("保存が空なら、累計も表示も 0", async (t) => {
    const { settings } = await setup(t);
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getShownStars(), 0);
  });

  for (const [stored, expected] of [
    ["12", 12],
    ["0", 0],
    ["-3", 0],
    ["abc", 0],
    ["", 0],
  ] as const) {
    test(`保存された累計 ${JSON.stringify(stored)} は ${expected} として読む`, async (t) => {
      const { settings } = await setup(t, { [KEY.totalStars]: stored });
      assert.equal(settings.getTotalStars(), expected);
    });
  }

  test("addStars は +1（既定）か +n して新しい累計を返し、数値の文字列で保存する", async (t) => {
    const { storage, settings } = await setup(t);
    assert.equal(settings.addStars(), 1);
    assert.equal(storage.snapshot()[KEY.totalStars], "1");
    assert.equal(settings.addStars(2), 3);
    assert.equal(storage.snapshot()[KEY.totalStars], "3");
    assert.equal(settings.getTotalStars(), 3);
  });

  test("addStars に 0 や負の数を渡しても累計は減らない", async (t) => {
    const { storage, settings } = await setup(t, { [KEY.totalStars]: "4" });
    assert.equal(settings.addStars(-5), 4);
    assert.equal(settings.addStars(0), 4);
    assert.equal(storage.snapshot()[KEY.totalStars], "4");
  });

  test("表示は「累計 − 控え」", async (t) => {
    const { settings } = await setup(t, {
      [KEY.totalStars]: "10",
      [KEY.starsResetAt]: "4",
    });
    assert.equal(settings.getShownStars(), 6);
    assert.equal(settings.getTotalStars(), 10);
  });

  test("「0に もどす」は控えを書くだけで、累計には触れない。そのあとの ⭐ は 0 から数え直す", async (t) => {
    const { storage, settings } = await setup(t, { [KEY.totalStars]: "5" });
    settings.resetShownStars();
    assert.deepEqual(storage.writes(), [
      { op: "set", key: KEY.starsResetAt, value: "5" },
    ]);
    assert.equal(settings.getShownStars(), 0);
    settings.addStars();
    assert.equal(settings.getShownStars(), 1);
    settings.addStars(2);
    assert.equal(settings.getShownStars(), 3);
    assert.equal(settings.getTotalStars(), 8);
    assert.deepEqual(storage.snapshot(), {
      [KEY.totalStars]: "8",
      [KEY.starsResetAt]: "5",
    });
  });

  test("控えが累計と同じなら、表示は 0 で控えはそのまま", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.totalStars]: "5",
      [KEY.starsResetAt]: "5",
    });
    assert.equal(settings.getShownStars(), 0);
    assert.equal(storage.snapshot()[KEY.starsResetAt], "5");
  });

  test("控えが累計より大きければ捨てる（キーを消し、表示は累計そのまま。累計は書き換えない）", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    assert.equal(settings.getShownStars(), 7);
    assert.deepEqual(storage.snapshot(), { [KEY.totalStars]: "7" });
    assert.deepEqual(storage.writes(), [
      { op: "remove", key: KEY.starsResetAt },
    ]);
    // 捨てずに無視しただけだと、累計が控えを越えた時点で表示が 12 - 9 = 3 に減って見えた。
    settings.addStars(5);
    assert.equal(settings.getShownStars(), 12);
  });

  test("控えを捨てる確認は、表示を開く前の addStars でも行う", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    assert.equal(settings.addStars(5), 12);
    assert.deepEqual(storage.snapshot(), { [KEY.totalStars]: "12" });
    assert.equal(settings.getShownStars(), 12);
  });

  test("控えが数でなければ 0 扱い（表示は累計そのまま）", async (t) => {
    const { settings } = await setup(t, {
      [KEY.totalStars]: "5",
      [KEY.starsResetAt]: "abc",
    });
    assert.equal(settings.getShownStars(), 5);
  });

  test("何をしても、累計の保存値は減らない", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.totalStars]: "3",
      [KEY.starsResetAt]: "8",
    });
    const totals: number[] = [];
    const record = () =>
      totals.push(Number(storage.snapshot()[KEY.totalStars]));
    record();
    settings.getShownStars();
    record();
    settings.addStars();
    record();
    settings.resetShownStars();
    record();
    settings.addStars(-2);
    record();
    settings.addStars(4);
    record();
    assert.deepEqual(
      totals,
      [...totals].sort((a, b) => a - b),
    );
    assert.equal(totals.at(-1), 8);
  });
});

describe("有効カテゴリ（kotoba.cats）", () => {
  test("保存が空なら、全 4 カテゴリが正規の並びで有効", async (t) => {
    const { settings } = await setup(t);
    assert.deepEqual(settings.getCategories(), CATEGORY_IDS);
  });

  test("保存された並びは 正規の並びに揃える", async (t) => {
    const { settings } = await setup(t, {
      [KEY.cats]: JSON.stringify(["norimono", "yasai"]),
    });
    assert.deepEqual(settings.getCategories(), ["yasai", "norimono"]);
  });

  test("重複と知らない id は取り除く", async (t) => {
    const { settings } = await setup(t, {
      [KEY.cats]: JSON.stringify(["yasai", "yasai", "bogus", "norimono"]),
    });
    assert.deepEqual(settings.getCategories(), ["yasai", "norimono"]);
  });

  for (const stored of [
    "[]",
    '["bogus"]',
    '{"yasai":true}',
    '"yasai"',
    "null",
    "5",
    '["yasai"',
    "",
  ]) {
    test(`壊れた保存値 ${JSON.stringify(stored)} は全カテゴリ（読むだけでは書き換えない）`, async (t) => {
      const { storage, settings } = await setup(t, { [KEY.cats]: stored });
      assert.deepEqual(settings.getCategories(), CATEGORY_IDS);
      assert.deepEqual(storage.writes(), []);
    });
  }

  test("setCategories は 正規の並びに揃えて返し、JSON の配列で保存する", async (t) => {
    const { storage, settings } = await setup(t);
    assert.deepEqual(settings.setCategories(["doubutsu", "yasai"]), [
      "yasai",
      "doubutsu",
    ]);
    assert.equal(storage.snapshot()[KEY.cats], '["yasai","doubutsu"]');
    assert.deepEqual(settings.getCategories(), ["yasai", "doubutsu"]);
  });

  test("setCategories は空を受け付けない（全カテゴリになる）", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.cats]: '["kudamono"]',
    });
    assert.deepEqual(settings.setCategories([]), CATEGORY_IDS);
    assert.equal(storage.snapshot()[KEY.cats], JSON.stringify(CATEGORY_IDS));
    assert.deepEqual(settings.getCategories(), CATEGORY_IDS);
  });

  test("toggleCategory は 1 つずつオン/オフでき、戻すと正規の並びに戻る", async (t) => {
    const { storage, settings } = await setup(t);
    assert.deepEqual(settings.toggleCategory("kudamono"), [
      "yasai",
      "doubutsu",
      "norimono",
    ]);
    assert.equal(
      storage.snapshot()[KEY.cats],
      '["yasai","doubutsu","norimono"]',
    );
    assert.deepEqual(settings.toggleCategory("kudamono"), CATEGORY_IDS);
    assert.equal(storage.snapshot()[KEY.cats], JSON.stringify(CATEGORY_IDS));
  });

  test("最後の 1 つはオフにできない（最低 1 つは残る）", async (t) => {
    const { storage, settings } = await setup(t);
    settings.toggleCategory("yasai");
    settings.toggleCategory("kudamono");
    assert.deepEqual(settings.toggleCategory("doubutsu"), ["norimono"]);
    assert.deepEqual(settings.toggleCategory("norimono"), ["norimono"]);
    assert.equal(storage.snapshot()[KEY.cats], '["norimono"]');
    assert.deepEqual(settings.getCategories(), ["norimono"]);
  });
});

// よみあげ（kotoba.tts）と BGM（kotoba.bgm）は同じ作り: 既定 on・"on"/"off" で保存・壊れた値は既定。
const SWITCHES = [
  {
    label: "よみあげ",
    key: KEY.tts,
    other: KEY.bgm,
    get: (s: Settings) => s.getTtsOn(),
    set: (s: Settings, on: boolean) => s.setTtsOn(on),
    getOther: (s: Settings) => s.getBgmOn(),
  },
  {
    label: "BGM",
    key: KEY.bgm,
    other: KEY.tts,
    get: (s: Settings) => s.getBgmOn(),
    set: (s: Settings, on: boolean) => s.setBgmOn(on),
    getOther: (s: Settings) => s.getTtsOn(),
  },
];

for (const sw of SWITCHES) {
  describe(`${sw.label}（${sw.key}）`, () => {
    test("保存が空なら on", async (t) => {
      const { settings } = await setup(t);
      assert.equal(sw.get(settings), true);
    });

    for (const [stored, expected] of [
      ["off", false],
      ["on", true],
    ] as const) {
      test(`保存された ${JSON.stringify(stored)} は ${expected}`, async (t) => {
        const { settings } = await setup(t, { [sw.key]: stored });
        assert.equal(sw.get(settings), expected);
      });
    }

    for (const stored of ["yes", "", "OFF", "1", "false"]) {
      test(`壊れた保存値 ${JSON.stringify(stored)} は既定（on）`, async (t) => {
        const { settings } = await setup(t, { [sw.key]: stored });
        assert.equal(sw.get(settings), true);
      });
    }

    test('保存は "on" / "off"、もう片方（よみあげと BGM）の設定には触れない', async (t) => {
      const { storage, settings } = await setup(t);
      sw.set(settings, false);
      assert.deepEqual(storage.snapshot(), { [sw.key]: "off" });
      assert.equal(sw.get(settings), false);
      assert.equal(sw.getOther(settings), true);
      sw.set(settings, true);
      assert.deepEqual(storage.snapshot(), { [sw.key]: "on" });
      assert.equal(sw.get(settings), true);
    });
  });
}

describe("もじ（kotoba.moji）", () => {
  test("保存が空なら hiragana", async (t) => {
    const { settings } = await setup(t);
    assert.equal(settings.getMoji(), "hiragana");
  });

  for (const mode of ["hiragana", "katakana", "mazegaki"] as const) {
    test(`保存された ${mode} を読む`, async (t) => {
      const { settings } = await setup(t, { [KEY.moji]: mode });
      assert.equal(settings.getMoji(), mode);
    });
  }

  for (const stored of ["romaji", "", "Hiragana", "katakana "]) {
    test(`壊れた保存値 ${JSON.stringify(stored)} は hiragana`, async (t) => {
      const { settings } = await setup(t, { [KEY.moji]: stored });
      assert.equal(settings.getMoji(), "hiragana");
    });
  }

  test("setMoji はそのままの文字列で保存する", async (t) => {
    const { storage, settings } = await setup(t);
    settings.setMoji("mazegaki");
    assert.deepEqual(storage.snapshot(), { [KEY.moji]: "mazegaki" });
    assert.equal(settings.getMoji(), "mazegaki");
  });

  test("setMoji に知らないモードを渡すと hiragana を保存する", async (t) => {
    const { storage, settings } = await setup(t);
    settings.setMoji("romaji" as MojiMode);
    assert.deepEqual(storage.snapshot(), { [KEY.moji]: "hiragana" });
    assert.equal(settings.getMoji(), "hiragana");
  });
});

describe("保存キー", () => {
  test("書き込まれるキーは kotoba.* の 6 つだけで、値の形はこの通り", async (t) => {
    const { storage, settings } = await setup(t);
    settings.addStars();
    settings.resetShownStars();
    settings.setCategories(["kudamono", "yasai"]);
    settings.setTtsOn(false);
    settings.setBgmOn(false);
    settings.setMoji("mazegaki");
    assert.deepEqual(storage.snapshot(), {
      "kotoba.totalStars": "1",
      "kotoba.starsResetAt": "1",
      "kotoba.cats": '["yasai","kudamono"]',
      "kotoba.tts": "off",
      "kotoba.bgm": "off",
      "kotoba.moji": "mazegaki",
    });
  });

  test("読むときも書くときも kotoba.* 以外のキーには触れない（他アプリ・街のキーは読み書き禁止）", async (t) => {
    const decoys = {
      "meiro.totalStars": "99",
      "sansu.totalStars": "98",
      "land.fuel": "97",
    };
    const { storage, settings } = await setup(t, decoys);
    settings.getTotalStars();
    settings.getShownStars();
    settings.getCategories();
    settings.getTtsOn();
    settings.getBgmOn();
    settings.getMoji();
    settings.addStars();
    settings.resetShownStars();
    settings.toggleCategory("yasai");
    settings.setTtsOn(false);
    settings.setBgmOn(false);
    settings.setMoji("katakana");
    assert.ok(storage.log.length > 0);
    for (const call of storage.log) {
      assert.ok(
        call.key.startsWith("kotoba."),
        `kotoba.* 以外に触れた: ${call.op} ${call.key}`,
      );
    }
    for (const [key, value] of Object.entries(decoys)) {
      assert.equal(storage.snapshot()[key], value, key);
    }
  });

  test("一度読んだ値は覚えていて、同じ起動中は保存側が変わっても同じ値を返す", async (t) => {
    const { storage, settings } = await setup(t, { [KEY.tts]: "off" });
    assert.equal(settings.getTtsOn(), false);
    storage.data.set(KEY.tts, "on");
    assert.equal(settings.getTtsOn(), false);
  });
});

describe("保存できない・壊れた環境でも落ちない", () => {
  test("読み出しが例外を投げても、どの設定も既定で動く", async (t) => {
    const { settings } = await setup(t, {}, { failReads: true });
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getShownStars(), 0);
    assert.deepEqual(settings.getCategories(), CATEGORY_IDS);
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.getBgmOn(), true);
    assert.equal(settings.getMoji(), "hiragana");
  });

  test("書き込みが例外を投げても、同じ起動中は新しい値で動き続ける", async (t) => {
    const { storage, settings } = await setup(t, {}, { failWrites: true });
    assert.equal(settings.addStars(3), 3);
    assert.equal(settings.getTotalStars(), 3);
    settings.resetShownStars();
    assert.equal(settings.getShownStars(), 0);
    assert.deepEqual(settings.setCategories(["yasai"]), ["yasai"]);
    assert.deepEqual(settings.getCategories(), ["yasai"]);
    settings.setTtsOn(false);
    assert.equal(settings.getTtsOn(), false);
    settings.setBgmOn(false);
    assert.equal(settings.getBgmOn(), false);
    settings.setMoji("katakana");
    assert.equal(settings.getMoji(), "katakana");
    assert.deepEqual(storage.snapshot(), {});
  });

  test("控えを捨てるときに消せなくても、表示は累計そのまま", async (t) => {
    const { settings } = await setup(
      t,
      { [KEY.totalStars]: "7", [KEY.starsResetAt]: "9" },
      { failWrites: true },
    );
    assert.equal(settings.getShownStars(), 7);
  });

  test("localStorage に触るだけで例外が出る環境（プライベートモードなど）でも既定で動く", async (t) => {
    t.after(
      installLocalStorage({
        get() {
          throw new Error("SecurityError");
        },
      }),
    );
    const settings = await freshSettings();
    assert.equal(settings.getTotalStars(), 0);
    assert.deepEqual(settings.getCategories(), CATEGORY_IDS);
    assert.equal(settings.addStars(), 1);
    settings.setTtsOn(false);
    assert.equal(settings.getTtsOn(), false);
  });

  test("localStorage が無い環境でも既定で動く", async () => {
    const settings = await freshSettings();
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.setCategories(["doubutsu"]).length, 1);
  });

  test("web 以外（native）では localStorage に触れず、同じ起動中の覚えだけで動く", async (t) => {
    const { storage, settings } = await setup(t, {
      [KEY.tts]: "off",
      [KEY.totalStars]: "5",
    });
    Platform.OS = "ios";
    t.after(() => {
      Platform.OS = "web";
    });
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.addStars(2), 2);
    settings.setTtsOn(false);
    assert.equal(settings.getTtsOn(), false);
    assert.deepEqual(storage.log, []);
  });
});
