// 単語辞書（DESIGN §3）。1件 = { emoji, word(ひらがな), category, katakanaNatural }。
// 4カテゴリ × 10語 = 40語。word は全語ユニーク・emoji も全語ユニーク（重複なし）。
// 読み上げ文字列はそのまま word を使う（連濁・表記ゆれを避ける）。
//
// katakanaNatural … 「まぜがき」表示でカタカナにする語（外来語・日常でカタカナ表記が普通の語）。
// 迷う語はひらがな側に倒す（false）。表示（出題バー・正解カードのラベル）だけに効く設定。
//
// カテゴリをまたぐ「見た目が紛らわしい」組み合わせ（例 🍎りんご と 🍅とまと）は quiz.ts の
// CONFUSABLE で1問に同居しないようにする。同カテゴリ内は1問に最大1語しか出ないので同居しない。

import { CategoryId, MojiMode, WordItem } from '../types';

// カテゴリの表示ラベルと絵文字（おとなモードのオン/オフ表示に使う）。
export const CATEGORY_LABELS: Record<CategoryId, { label: string; emoji: string }> = {
  yasai: { label: 'やさい', emoji: '🥕' },
  kudamono: { label: 'くだもの', emoji: '🍓' },
  doubutsu: { label: 'どうぶつ', emoji: '🐰' },
  norimono: { label: 'のりもの', emoji: '🚗' },
};

export const WORDS: WordItem[] = [
  // やさい（10）
  { id: 'ninjin', emoji: '🥕', word: 'にんじん', svg: require('../../assets/svg/ninjin.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'tomato', emoji: '🍅', word: 'とまと', svg: require('../../assets/svg/tomato.svg'), category: 'yasai', katakanaNatural: true },
  { id: 'nasu', emoji: '🍆', word: 'なす', svg: require('../../assets/svg/nasu.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'toumorokoshi', emoji: '🌽', word: 'とうもろこし', svg: require('../../assets/svg/toumorokoshi.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'piiman', emoji: '🫑', word: 'ぴーまん', svg: require('../../assets/svg/piiman.svg'), category: 'yasai', katakanaNatural: true },
  { id: 'kyuuri', emoji: '🥒', word: 'きゅうり', svg: require('../../assets/svg/kyuuri.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'jagaimo', emoji: '🥔', word: 'じゃがいも', svg: require('../../assets/svg/jagaimo.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'satsumaimo', emoji: '🍠', word: 'さつまいも', svg: require('../../assets/svg/satsumaimo.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'tamanegi', emoji: '🧅', word: 'たまねぎ', svg: require('../../assets/svg/tamanegi.svg'), category: 'yasai', katakanaNatural: false },
  { id: 'burokkorii', emoji: '🥦', word: 'ぶろっこりー', svg: require('../../assets/svg/burokkorii.svg'), category: 'yasai', katakanaNatural: true },

  // くだもの（10）
  { id: 'banana', emoji: '🍌', word: 'ばなな', svg: require('../../assets/svg/banana.svg'), category: 'kudamono', katakanaNatural: true },
  { id: 'ringo', emoji: '🍎', word: 'りんご', svg: require('../../assets/svg/ringo.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'ichigo', emoji: '🍓', word: 'いちご', svg: require('../../assets/svg/ichigo.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'budou', emoji: '🍇', word: 'ぶどう', svg: require('../../assets/svg/budou.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'mikan', emoji: '🍊', word: 'みかん', svg: require('../../assets/svg/mikan.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'suika', emoji: '🍉', word: 'すいか', svg: require('../../assets/svg/suika.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'momo', emoji: '🍑', word: 'もも', svg: require('../../assets/svg/momo.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'sakuranbo', emoji: '🍒', word: 'さくらんぼ', svg: require('../../assets/svg/sakuranbo.svg'), category: 'kudamono', katakanaNatural: false },
  { id: 'meron', emoji: '🍈', word: 'めろん', svg: require('../../assets/svg/meron.svg'), category: 'kudamono', katakanaNatural: true },
  { id: 'painappuru', emoji: '🍍', word: 'ぱいなっぷる', svg: require('../../assets/svg/painappuru.svg'), category: 'kudamono', katakanaNatural: true },

  // どうぶつ（10）
  { id: 'inu', emoji: '🐶', word: 'いぬ', svg: require('../../assets/svg/inu.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'neko', emoji: '🐱', word: 'ねこ', svg: require('../../assets/svg/neko.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'usagi', emoji: '🐰', word: 'うさぎ', svg: require('../../assets/svg/usagi.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'zou', emoji: '🐘', word: 'ぞう', svg: require('../../assets/svg/zou.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'raion', emoji: '🦁', word: 'らいおん', svg: require('../../assets/svg/raion.svg'), category: 'doubutsu', katakanaNatural: true },
  { id: 'kirin', emoji: '🦒', word: 'きりん', svg: require('../../assets/svg/kirin.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'panda', emoji: '🐼', word: 'ぱんだ', svg: require('../../assets/svg/panda.svg'), category: 'doubutsu', katakanaNatural: true },
  { id: 'saru', emoji: '🐵', word: 'さる', svg: require('../../assets/svg/saru.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'kuma', emoji: '🐻', word: 'くま', svg: require('../../assets/svg/kuma.svg'), category: 'doubutsu', katakanaNatural: false },
  { id: 'buta', emoji: '🐷', word: 'ぶた', svg: require('../../assets/svg/buta.svg'), category: 'doubutsu', katakanaNatural: false },

  // のりもの（10）
  { id: 'kuruma', emoji: '🚗', word: 'くるま', svg: require('../../assets/svg/kuruma.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'basu', emoji: '🚌', word: 'ばす', svg: require('../../assets/svg/basu.svg'), category: 'norimono', katakanaNatural: true },
  { id: 'densha', emoji: '🚃', word: 'でんしゃ', svg: require('../../assets/svg/densha.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'hikouki', emoji: '✈️', word: 'ひこうき', svg: require('../../assets/svg/hikouki.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'fune', emoji: '🚢', word: 'ふね', svg: require('../../assets/svg/fune.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'shoubousha', emoji: '🚒', word: 'しょうぼうしゃ', svg: require('../../assets/svg/shoubousha.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'kyuukyuusha', emoji: '🚑', word: 'きゅうきゅうしゃ', svg: require('../../assets/svg/kyuukyuusha.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'jitensha', emoji: '🚲', word: 'じてんしゃ', svg: require('../../assets/svg/jitensha.svg'), category: 'norimono', katakanaNatural: false },
  { id: 'herikoputaa', emoji: '🚁', word: 'へりこぷたー', svg: require('../../assets/svg/herikoputaa.svg'), category: 'norimono', katakanaNatural: true },
  { id: 'roketto', emoji: '🚀', word: 'ろけっと', svg: require('../../assets/svg/roketto.svg'), category: 'norimono', katakanaNatural: true },
];

// カテゴリ id → その語リスト（quiz が使う）。
export function wordsByCategory(id: CategoryId): WordItem[] {
  return WORDS.filter((w) => w.category === id);
}

// ── もじ表示（ひらがな / カタカナ / まぜがき）───────────────────────────────
// 表示ラベルだけを作る純関数群。内部の同一性（word）・読み上げ・SVG・出題ロジックには一切触れない。

// ひらがな → カタカナ の機械変換。U+3041..U+3096（ぁ..ゖ）を +0x60 して U+30A1..U+30F6（ァ..ヶ）へ。
// 長音符「ー」や中黒・記号など範囲外の文字はそのまま通す（変換対象は清音・濁音・半濁音・小書き・っ）。
export function toKatakana(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x3041 && code <= 0x3096) {
      out += String.fromCodePoint(code + 0x60);
    } else {
      out += ch;
    }
  }
  return out;
}

// もじモードに応じた「表示用ラベル」を返す（word 本体は不変）。
//   ・hiragana … word のまま。
//   ・katakana … 全部カタカナへ機械変換。
//   ・mazegaki … katakanaNatural の語だけカタカナ、ほかは word のまま。
export function displayWord(item: WordItem, mode: MojiMode): string {
  if (mode === 'katakana') return toKatakana(item.word);
  if (mode === 'mazegaki') return item.katakanaNatural ? toKatakana(item.word) : item.word;
  return item.word;
}
