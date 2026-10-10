// 同梱音声クリップの登録表（src/audio/voiceClips.ts）と、語データ・読み上げの対応の現状を固定する（K-10）。
// 語を足すたびに words.ts（id・svg）と voiceClips.ts（<id>・ask_<id>）の 2 ファイルを手で揃える。
// その揃え忘れを、クリップが鳴らない前に（CI で）見つける。
// 規約（voiceClips.ts の冒頭）: 単語 = 単語 id / 出題文 = ask_<単語 id> / 定型句 = p_*。
// 現状: 単語 40 + 出題文 40 + 定型句 4（p_seikai・p_title・p_arere・p_oshii）= 84 個。

import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { PHRASE_VOICE, askVoice, wordVoice } from "../src/audio/voice";
import { CLIP_URLS, hasClip } from "../src/audio/voiceClips";
import { WORDS } from "../src/game/words";
import { ROOT, assetPath } from "./helpers";

const PHRASE_CLIPS = ["p_arere", "p_oshii", "p_seikai", "p_title"];

// 40 語それぞれの単語クリップ（<id>）と出題文クリップ（ask_<id>）。
const WORD_CLIP_NAMES = WORDS.flatMap((w) => [w.id, `ask_${w.id}`]);

describe("クリップ表（CLIP_URLS）", () => {
  test("84 個: 単語 40 + 出題文 40 + 定型句 4。語に対するクリップの欠けは 0", () => {
    assert.equal(Object.keys(CLIP_URLS).length, 84);
    const missing = WORD_CLIP_NAMES.filter((name) => !hasClip(name));
    assert.deepEqual(missing, [], "表に無いクリップ");
  });

  test("語に属さないクリップは定型句の 4 つだけ", () => {
    const others = Object.keys(CLIP_URLS).filter(
      (name) => !WORD_CLIP_NAMES.includes(name),
    );
    assert.deepEqual(others.sort(), PHRASE_CLIPS);
  });

  test("キーはファイルの基名と同じで、assets/voice に空でないファイルが実在する", () => {
    for (const [name, url] of Object.entries(CLIP_URLS)) {
      const file = assetPath(url);
      assert.equal(file, path.join(ROOT, "assets/voice", `${name}.m4a`), name);
      assert.ok(statSync(file).size > 0, `${name}.m4a が空`);
    }
  });

  test("assets/voice の m4a は、すべて表に載っている（登録し忘れの音声が無い）", () => {
    const files = readdirSync(path.join(ROOT, "assets/voice"))
      .filter((name) => name.endsWith(".m4a"))
      .map((name) => name.slice(0, -".m4a".length))
      .sort();
    assert.deepEqual(files, Object.keys(CLIP_URLS).sort());
  });
});

describe("hasClip", () => {
  test("登録済みの基名は true", () => {
    assert.equal(hasClip("banana"), true);
    assert.equal(hasClip("ask_banana"), true);
    assert.equal(hasClip("p_title"), true);
  });

  test("未登録・空・undefined は false", () => {
    assert.equal(hasClip("nothing"), false);
    assert.equal(hasClip("ask_nothing"), false);
    assert.equal(hasClip(""), false);
    assert.equal(hasClip(undefined), false);
  });

  test("Object のプロパティ名（toString など）は登録済みと見なさない", () => {
    for (const name of [
      "toString",
      "constructor",
      "__proto__",
      "hasOwnProperty",
    ]) {
      assert.equal(hasClip(name), false, name);
    }
  });
});

describe("読み上げの指定（voice.ts）が指すクリップ", () => {
  test("wordVoice は <id>、askVoice は ask_<id> を指し、どれも表にある", () => {
    for (const w of WORDS) {
      assert.equal(wordVoice(w).clip, w.id);
      assert.equal(askVoice(w).clip, `ask_${w.id}`);
      assert.equal(hasClip(wordVoice(w).clip), true, `${w.id}`);
      assert.equal(hasClip(askVoice(w).clip), true, `ask_${w.id}`);
    }
  });

  test("クリップが無い環境のための読み上げ文字列: 単語は word、出題文は「<word> は どれ？」", () => {
    for (const w of WORDS) {
      assert.equal(wordVoice(w).text, w.word);
      assert.equal(askVoice(w).text, `${w.word} は どれ？`);
    }
  });

  test("定型句 seikai・title・arere・oshii のクリップは表にある（p_*）", () => {
    const clips = Object.values(PHRASE_VOICE).map((spec) => spec.clip);
    assert.deepEqual([...clips].sort(), PHRASE_CLIPS);
    for (const clip of clips) assert.equal(hasClip(clip), true, String(clip));
  });

  test("定型句のフォールバック文字列", () => {
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(PHRASE_VOICE).map(([key, spec]) => [key, spec.text]),
      ),
      {
        seikai: "せいかい",
        title: "ぴよぴよことば",
        arere: "あれれ",
        oshii: "おしい",
      },
    );
  });
});
